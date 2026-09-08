import ExpoModulesCore
import AVFoundation
import CoreBluetooth
import Foundation

private let crusherAppGroup = "group.com.crusherevo.boost.audio"

public final class CrusherAudioUnitModule: Module {
  private let bluetoothAnalyzer = BluetoothAnalyzer()
  private let audioSession = AVAudioSession.sharedInstance()
  private var routeObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("CrusherAudioUnit")
    Events("analysisEvent", "outputRouteChanged")

    OnCreate {
      routeObserver = NotificationCenter.default.addObserver(
        forName: AVAudioSession.routeChangeNotification,
        object: audioSession,
        queue: .main
      ) { [weak self] _ in
        self?.sendCurrentOutputRoute()
      }
    }

    OnDestroy {
      if let routeObserver {
        NotificationCenter.default.removeObserver(routeObserver)
        self.routeObserver = nil
      }
    }

    AsyncFunction("syncProfile") { (bassBoost: Double, subBass: Double, bands: [Double]) in
      guard let defaults = UserDefaults(suiteName: crusherAppGroup) else {
        throw NSError(domain: "CrusherAudioUnit", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "Audio Unit App Groupを利用できません。",
        ])
      }
      defaults.set(bassBoost, forKey: "bassBoost")
      defaults.set(subBass, forKey: "subBass")
      defaults.set(bands, forKey: "bands")
      defaults.synchronize()
    }

    AsyncFunction("activateAudioSession") { [weak self] in
      guard let self else {
        throw NSError(domain: "CrusherAudioUnit", code: 3, userInfo: [
          NSLocalizedDescriptionKey: "音声モジュールが利用できません。",
        ])
      }
      do {
        try audioSession.setCategory(.playback, mode: .music, options: [.allowBluetooth, .allowBluetoothA2DP])
        try audioSession.setActive(true)
        return currentOutputRoute()
      } catch {
        throw NSError(domain: "CrusherAudioUnit", code: 2, userInfo: [
          NSLocalizedDescriptionKey: "音声出力を有効化できませんでした: \(error.localizedDescription)",
        ])
      }
    }
    .runOnQueue(.main)

    AsyncFunction("getCurrentOutput") { [weak self] in
      self?.currentOutputRoute() ?? [
        "connected": false,
        "isBluetooth": false,
        "name": "",
        "type": "unavailable",
      ]
    }
    .runOnQueue(.main)

    AsyncFunction("startBluetoothAnalysis") { [weak self] in
      guard let self else { return }
      self.bluetoothAnalyzer.onEvent = { [weak self] event in
        self?.sendEvent("analysisEvent", event)
      }
      self.bluetoothAnalyzer.start()
    }
    .runOnQueue(.main)

    AsyncFunction("stopBluetoothAnalysis") { [weak self] in
      self?.bluetoothAnalyzer.stop()
    }
    .runOnQueue(.main)

    AsyncFunction("connectAnalysisPeripheral") { [weak self] (identifier: String) in
      self?.bluetoothAnalyzer.connect(identifier: identifier)
    }
    .runOnQueue(.main)
  }

  private func currentOutputRoute() -> [String: Any] {
    let output = audioSession.currentRoute.outputs.first
    let portType = output?.portType ?? .builtInSpeaker
    let isBluetooth = portType == .bluetoothA2DP || portType == .bluetoothHFP || portType == .bluetoothLE
    return [
      "connected": output != nil,
      "isBluetooth": isBluetooth,
      "name": output?.portName ?? (isBluetooth ? "" : "iPhoneスピーカー"),
      "type": portType.rawValue,
    ]
  }

  private func sendCurrentOutputRoute() {
    sendEvent("outputRouteChanged", currentOutputRoute())
  }
}

private final class BluetoothAnalyzer: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
  private var central: CBCentralManager?
  private var peripherals: [UUID: CBPeripheral] = [:]
  var onEvent: (([String: Any?]) -> Void)?

  func start() {
    emit(type: "status", message: "Bluetoothスキャンを開始しました。Crusher EVOの電源を入れてください。")
    if central == nil {
      central = CBCentralManager(delegate: self, queue: .main)
    } else if central?.state == .poweredOn {
      scan()
    }
  }

  func stop() {
    central?.stopScan()
    peripherals.values.forEach { peripheral in
      peripheral.delegate = nil
      central?.cancelPeripheralConnection(peripheral)
    }
    emit(type: "status", message: "Bluetooth解析を停止しました。")
    peripherals.removeAll()
    onEvent = nil
  }

  func connect(identifier: String) {
    guard let uuid = UUID(uuidString: identifier), let peripheral = peripherals[uuid] else {
      emit(type: "error", message: "解析対象のBluetooth機器が見つかりません。")
      return
    }
    peripheral.delegate = self
    emit(type: "status", message: "\(peripheral.name ?? "Unknown")へ接続しています。")
    central?.connect(peripheral, options: nil)
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    switch central.state {
    case .poweredOn:
      emit(type: "status", message: "Bluetoothが有効です。周辺機器をスキャンしています。")
      scan()
    case .poweredOff:
      emit(type: "error", message: "Bluetoothがオフです。iPhoneの設定から有効にしてください。")
    case .unauthorized:
      emit(type: "error", message: "Bluetoothの使用が許可されていません。")
    default:
      emit(type: "status", message: "Bluetoothの準備を待っています。")
    }
  }

  private func scan() {
    central?.scanForPeripherals(withServices: nil, options: [
      CBCentralManagerScanOptionAllowDuplicatesKey: false,
    ])
  }

  func centralManager(
    _ central: CBCentralManager,
    didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any],
    rssi RSSI: NSNumber
  ) {
    peripherals[peripheral.identifier] = peripheral
    let name = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? "Unknown"
    emit(type: "peripheral", id: peripheral.identifier.uuidString, name: name, rssi: RSSI.intValue)

    if name.localizedCaseInsensitiveContains("crusher") || name.localizedCaseInsensitiveContains("s6evw") {
      peripheral.delegate = self
      central.stopScan()
      emit(type: "status", message: "\(name)を検出しました。サービスを確認しています。")
      central.connect(peripheral, options: nil)
    }
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    emit(type: "connected", id: peripheral.identifier.uuidString, name: peripheral.name ?? "Unknown")
    peripheral.delegate = self
    peripheral.discoverServices(nil)
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    emit(type: "error", message: "接続できませんでした: \(error?.localizedDescription ?? "Unknown error")")
  }

  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    emit(type: "status", message: "\(peripheral.name ?? "Bluetooth機器")との接続を終了しました。")
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    if let error {
      emit(type: "error", message: "サービス列挙に失敗しました: \(error.localizedDescription)")
      return
    }
    peripheral.services?.forEach { service in
      emit(type: "service", peripheralId: peripheral.identifier.uuidString, uuid: service.uuid.uuidString)
      peripheral.discoverCharacteristics(nil, for: service)
    }
  }

  func peripheral(
    _ peripheral: CBPeripheral,
    didDiscoverCharacteristicsFor service: CBService,
    error: Error?
  ) {
    if let error {
      emit(type: "error", message: "Characteristic列挙に失敗しました: \(error.localizedDescription)")
      return
    }
    service.characteristics?.forEach { characteristic in
      emit(
        type: "characteristic",
        serviceUuid: service.uuid.uuidString,
        uuid: characteristic.uuid.uuidString,
        properties: propertyNames(characteristic.properties)
      )
      if characteristic.properties.contains(.read) {
        peripheral.readValue(for: characteristic)
      }
    }
  }

  func peripheral(
    _ peripheral: CBPeripheral,
    didUpdateValueFor characteristic: CBCharacteristic,
    error: Error?
  ) {
    if let error {
      emit(type: "valueError", uuid: characteristic.uuid.uuidString, message: error.localizedDescription)
      return
    }
    emit(
      type: "value",
      uuid: characteristic.uuid.uuidString,
      hex: characteristic.value.map(hex) ?? "",
      length: characteristic.value?.count ?? 0
    )
  }

  private func propertyNames(_ properties: CBCharacteristicProperties) -> String {
    var names: [String] = []
    if properties.contains(.read) { names.append("read") }
    if properties.contains(.write) { names.append("write") }
    if properties.contains(.writeWithoutResponse) { names.append("writeWithoutResponse") }
    if properties.contains(.notify) { names.append("notify") }
    if properties.contains(.indicate) { names.append("indicate") }
    return names.joined(separator: ",")
  }

  private func emit(type: String, _ values: [String: Any?] = [:]) {
    var body = values
    body["type"] = type
    onEvent?(body)
  }

  private func emit(type: String, message: String) {
    emit(type: type, ["message": message])
  }

  private func emit(type: String, id: String, name: String, rssi: Int) {
    emit(type: type, ["id": id, "name": name, "rssi": rssi])
  }

  private func emit(type: String, id: String, name: String) {
    emit(type: type, ["id": id, "name": name])
  }

  private func emit(type: String, peripheralId: String, uuid: String) {
    emit(type: type, ["peripheralId": peripheralId, "uuid": uuid])
  }

  private func emit(type: String, serviceUuid: String, uuid: String, properties: String) {
    emit(type: type, ["serviceUuid": serviceUuid, "uuid": uuid, "properties": properties])
  }

  private func emit(type: String, uuid: String, hex: String, length: Int) {
    emit(type: type, ["uuid": uuid, "hex": hex, "length": length])
  }

  private func emit(type: String, uuid: String, message: String) {
    emit(type: type, ["uuid": uuid, "message": message])
  }

  private func hex(_ data: Data) -> String {
    data.map { String(format: "%02X", $0) }.joined(separator: " ")
  }
}