import ExpoModulesCore
import AVFoundation
import CoreBluetooth
import Foundation

private let crusherAppGroup = "group.com.crusherevo.boost.audio"

public final class CrusherAudioUnitModule: Module {
  private let bluetoothAnalyzer = BluetoothAnalyzer()
  private let audioSession = AVAudioSession.sharedInstance()
  private var audioSessionObservers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("CrusherAudioUnit")
    Events("analysisEvent", "outputRouteChanged")

    OnCreate {
      let notificationCenter = NotificationCenter.default
      audioSessionObservers = [
        notificationCenter.addObserver(
          forName: AVAudioSession.routeChangeNotification,
          object: audioSession,
          queue: .main
        ) { [weak self] _ in
          self?.notifyOutputRouteChanged()
        },
        notificationCenter.addObserver(
          forName: AVAudioSession.interruptionNotification,
          object: audioSession,
          queue: .main
        ) { [weak self] _ in
          self?.notifyOutputRouteChanged()
        },
        notificationCenter.addObserver(
          forName: AVAudioSession.mediaServicesWereResetNotification,
          object: audioSession,
          queue: .main
        ) { [weak self] _ in
          self?.notifyOutputRouteChanged()
        },
      ]
      sendCurrentOutputRoute()
    }

    OnDestroy {
      let notificationCenter = NotificationCenter.default
      audioSessionObservers.forEach { observer in
        notificationCenter.removeObserver(observer)
      }
      audioSessionObservers.removeAll()
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
        try audioSession.setCategory(.playback, mode: .default, options: [.allowBluetooth, .allowBluetoothA2DP])
        try audioSession.setActive(true)
        let route = currentOutputRoute()
        notifyOutputRouteChanged()
        return route
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

    AsyncFunction("readAnalysisCharacteristic") { [weak self] (
      identifier: String,
      serviceUuid: String,
      characteristicUuid: String
    ) in
      self?.bluetoothAnalyzer.read(
        identifier: identifier,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid
      )
    }
    .runOnQueue(.main)

    AsyncFunction("setAnalysisNotify") { [weak self] (
      identifier: String,
      serviceUuid: String,
      characteristicUuid: String,
      enabled: Bool
    ) in
      self?.bluetoothAnalyzer.setNotify(
        identifier: identifier,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid,
        enabled: enabled
      )
    }
    .runOnQueue(.main)

    AsyncFunction("writeAnalysisCharacteristic") { [weak self] (
      identifier: String,
      serviceUuid: String,
      characteristicUuid: String,
      hex: String,
      withoutResponse: Bool
    ) in
      self?.bluetoothAnalyzer.write(
        identifier: identifier,
        serviceUuid: serviceUuid,
        characteristicUuid: characteristicUuid,
        hex: hex,
        withoutResponse: withoutResponse
      )
    }
    .runOnQueue(.main)
  }

  private func currentOutputRoute() -> [String: Any] {
    let outputs = audioSession.currentRoute.outputs
    let bluetoothOutput = outputs.first { output in
      isBluetoothPort(output.portType)
    }
    let output = bluetoothOutput ?? outputs.first
    let portType = output?.portType ?? .builtInSpeaker
    let isBluetooth = bluetoothOutput != nil
    let name = bluetoothOutput?.portName ?? output?.portName ?? ""
    return [
      "connected": !outputs.isEmpty,
      "isBluetooth": isBluetooth,
      "name": name.isEmpty && !isBluetooth ? "iPhoneスピーカー" : name,
      "type": portType.rawValue,
    ]
  }

  private func isBluetoothPort(_ portType: AVAudioSession.Port) -> Bool {
    portType == .bluetoothA2DP || portType == .bluetoothHFP || portType == .bluetoothLE
  }

  private func notifyOutputRouteChanged() {
    DispatchQueue.main.async { [weak self] in
      self?.sendCurrentOutputRoute()
    }
  }

  private func sendCurrentOutputRoute() {
    sendEvent("outputRouteChanged", currentOutputRoute())
  }
}

private final class BluetoothAnalyzer: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
  private var central: CBCentralManager?
  private var peripherals: [UUID: CBPeripheral] = [:]
  private var connecting: Set<UUID> = []
  private var connected: Set<UUID> = []
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
    connecting.removeAll()
    connected.removeAll()
    onEvent = nil
  }

  func connect(identifier: String) {
    guard let uuid = UUID(uuidString: identifier), let peripheral = peripherals[uuid] else {
      emit(type: "error", message: "解析対象のBluetooth機器が見つかりません。")
      return
    }
    connect(peripheral)
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
    let advertisedName = advertisementData[CBAdvertisementDataLocalNameKey] as? String
    let name = advertisedName?.isEmpty == false
      ? advertisedName!
      : (peripheral.name ?? "Unknown")
    emit(type: "peripheral", id: peripheral.identifier.uuidString, name: name, rssi: RSSI.intValue)

    let normalizedName = name.replacingOccurrences(of: " ", with: "").lowercased()
    if normalizedName.contains("crusher") || normalizedName.contains("s6evw") {
      emit(type: "status", message: "\(name)を検出しました。機器行をタップして接続してください。")
    }
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    connecting.remove(peripheral.identifier)
    connected.insert(peripheral.identifier)
    emit(type: "connected", id: peripheral.identifier.uuidString, name: peripheral.name ?? "Unknown")
    peripheral.delegate = self
    peripheral.discoverServices(nil)
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    connecting.remove(peripheral.identifier)
    emit(type: "error", message: "接続できませんでした: \(error?.localizedDescription ?? "Unknown error")")
  }

  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    connecting.remove(peripheral.identifier)
    connected.remove(peripheral.identifier)
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
        peripheralId: peripheral.identifier.uuidString,
        serviceUuid: service.uuid.uuidString,
        uuid: characteristic.uuid.uuidString,
        properties: propertyNames(characteristic.properties)
      )
      if shouldAutoSubscribe(service: service, characteristic: characteristic) {
        emit(type: "operation", [
          "operation": "notify",
          "peripheralId": peripheral.identifier.uuidString,
          "serviceUuid": service.uuid.uuidString,
          "uuid": characteristic.uuid.uuidString,
          "message": "制御候補のnotifyを自動購読しました。",
        ])
        peripheral.setNotifyValue(true, for: characteristic)
      }
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
      emit(type: "valueError", [
        "peripheralId": peripheral.identifier.uuidString,
        "serviceUuid": characteristic.service?.uuid.uuidString ?? "",
        "uuid": characteristic.uuid.uuidString,
        "message": error.localizedDescription,
      ])
      return
    }
    emit(
      type: "value",
      [
        "peripheralId": peripheral.identifier.uuidString,
        "serviceUuid": characteristic.service?.uuid.uuidString ?? "",
        "uuid": characteristic.uuid.uuidString,
        "hex": characteristic.value.map(hex) ?? "",
        "length": characteristic.value?.count ?? 0,
        "source": characteristic.isNotifying ? "notify" : "read",
      ]
    )
  }

  func read(identifier: String, serviceUuid: String, characteristicUuid: String) {
    guard let target = target(identifier: identifier, serviceUuid: serviceUuid, characteristicUuid: characteristicUuid) else {
      emit(type: "error", message: "読み取り対象のCharacteristicが見つかりません。")
      return
    }
    guard target.characteristic.properties.contains(.read) else {
      emit(type: "error", message: "\(characteristicUuid)にはread権限がありません。")
      return
    }
    emit(type: "operation", [
      "operation": "read",
      "peripheralId": identifier,
      "serviceUuid": serviceUuid,
      "uuid": characteristicUuid,
      "message": "readを要求しました。",
    ])
    target.peripheral.readValue(for: target.characteristic)
  }

  func setNotify(identifier: String, serviceUuid: String, characteristicUuid: String, enabled: Bool) {
    guard let target = target(identifier: identifier, serviceUuid: serviceUuid, characteristicUuid: characteristicUuid) else {
      emit(type: "error", message: "通知対象のCharacteristicが見つかりません。")
      return
    }
    guard target.characteristic.properties.contains(.notify) || target.characteristic.properties.contains(.indicate) else {
      emit(type: "error", message: "\(characteristicUuid)にはnotify/indicate権限がありません。")
      return
    }
    target.peripheral.setNotifyValue(enabled, for: target.characteristic)
  }

  func write(
    identifier: String,
    serviceUuid: String,
    characteristicUuid: String,
    hex: String,
    withoutResponse: Bool
  ) {
    guard let target = target(identifier: identifier, serviceUuid: serviceUuid, characteristicUuid: characteristicUuid) else {
      emit(type: "error", message: "書き込み対象のCharacteristicが見つかりません。")
      return
    }
    guard let data = dataFromHex(hex), !data.isEmpty else {
      emit(type: "error", message: "payloadはスペース区切りの16進数で入力してください。例: 01 00 FF")
      return
    }
    let writeType: CBCharacteristicWriteType = withoutResponse ? .withoutResponse : .withResponse
    let requiredProperty: CBCharacteristicProperties = withoutResponse ? .writeWithoutResponse : .write
    guard target.characteristic.properties.contains(requiredProperty) else {
      let mode = withoutResponse ? "writeWithoutResponse" : "write"
      emit(type: "error", message: "\(characteristicUuid)には\(mode)権限がありません。")
      return
    }
    target.peripheral.writeValue(data, for: target.characteristic, type: writeType)
    emit(type: "operation", [
      "operation": withoutResponse ? "writeWithoutResponse" : "write",
      "peripheralId": identifier,
      "serviceUuid": serviceUuid,
      "uuid": characteristicUuid,
      "hex": self.hex(data),
      "length": data.count,
      "message": "payloadを送信しました。",
    ])
  }

  func peripheral(
    _ peripheral: CBPeripheral,
    didWriteValueFor characteristic: CBCharacteristic,
    error: Error?
  ) {
    if let error {
      emit(type: "writeError", [
        "peripheralId": peripheral.identifier.uuidString,
        "serviceUuid": characteristic.service?.uuid.uuidString ?? "",
        "uuid": characteristic.uuid.uuidString,
        "message": error.localizedDescription,
      ])
      return
    }
    emit(type: "writeAck", [
      "peripheralId": peripheral.identifier.uuidString,
      "serviceUuid": characteristic.service?.uuid.uuidString ?? "",
      "uuid": characteristic.uuid.uuidString,
      "message": "write応答を受信しました。",
    ])
  }

  func peripheral(
    _ peripheral: CBPeripheral,
    didUpdateNotificationStateFor characteristic: CBCharacteristic,
    error: Error?
  ) {
    emit(type: error == nil ? "notifyState" : "notifyError", [
      "peripheralId": peripheral.identifier.uuidString,
      "serviceUuid": characteristic.service?.uuid.uuidString ?? "",
      "uuid": characteristic.uuid.uuidString,
      "enabled": characteristic.isNotifying,
      "message": error?.localizedDescription ?? (characteristic.isNotifying ? "通知を有効化しました。" : "通知を停止しました。"),
    ])
  }

  private func connect(_ peripheral: CBPeripheral) {
    let identifier = peripheral.identifier
    if connected.contains(identifier) || peripheral.state == .connected {
      emit(type: "status", message: "\(peripheral.name ?? "Unknown")は既に接続済みです。")
      return
    }
    if connecting.contains(identifier) {
      emit(type: "status", message: "\(peripheral.name ?? "Unknown")へ接続中です。")
      return
    }
    connecting.insert(identifier)
    peripheral.delegate = self
    central?.stopScan()
    emit(type: "status", message: "\(peripheral.name ?? "Unknown")へ接続しています。")
    central?.connect(peripheral, options: nil)
  }

  private func target(
    identifier: String,
    serviceUuid: String,
    characteristicUuid: String
  ) -> (peripheral: CBPeripheral, characteristic: CBCharacteristic)? {
    guard let uuid = UUID(uuidString: identifier), let peripheral = peripherals[uuid], peripheral.state == .connected else {
      return nil
    }
    let matchingService = peripheral.services?.first { service in
      service.uuid.uuidString.caseInsensitiveCompare(serviceUuid) == .orderedSame
    }
    let characteristics: [CBCharacteristic]
    if let serviceCharacteristics = matchingService?.characteristics {
      characteristics = serviceCharacteristics
    } else {
      characteristics = (peripheral.services ?? []).flatMap { $0.characteristics ?? [] }
    }
    guard let characteristic = characteristics.first(where: { item in
      item.uuid.uuidString.caseInsensitiveCompare(characteristicUuid) == .orderedSame
    }) else {
      return nil
    }
    return (peripheral, characteristic)
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

  private func shouldAutoSubscribe(service: CBService, characteristic: CBCharacteristic) -> Bool {
    guard characteristic.properties.contains(.notify) || characteristic.properties.contains(.indicate) else {
      return false
    }
    let serviceUuid = service.uuid.uuidString.lowercased()
    return serviceUuid == "feed" ||
      serviceUuid == "fdb3" ||
      serviceUuid == "00001100-d102-11e1-9b23-00025b00a5a5"
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

  private func emit(
    type: String,
    peripheralId: String,
    serviceUuid: String,
    uuid: String,
    properties: String
  ) {
    emit(type: type, [
      "peripheralId": peripheralId,
      "serviceUuid": serviceUuid,
      "uuid": uuid,
      "properties": properties,
    ])
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

  private func dataFromHex(_ value: String) -> Data? {
    let compact = value.replacingOccurrences(of: "[^0-9A-Fa-f]", with: "", options: .regularExpression)
    guard !compact.isEmpty, compact.count % 2 == 0 else { return nil }
    var bytes: [UInt8] = []
    bytes.reserveCapacity(compact.count / 2)
    var index = compact.startIndex
    while index < compact.endIndex {
      let next = compact.index(index, offsetBy: 2)
      guard let byte = UInt8(String(compact[index..<next]), radix: 16) else { return nil }
      bytes.append(byte)
      index = next
    }
    return Data(bytes)
  }
}