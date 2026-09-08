import AudioToolbox
import AVFoundation

private let crusherAppGroup = "group.com.crusherevo.boost.audio"

private enum ParameterAddress: AUParameterAddress {
  case bassBoost = 0
  case subBass = 1
  case band60 = 2
  case band150 = 3
  case band400 = 4
  case band1000 = 5
  case band4000 = 6
}

private struct Biquad {
  var b0: Float = 1
  var b1: Float = 0
  var b2: Float = 0
  var a1: Float = 0
  var a2: Float = 0
  var z1: Float = 0
  var z2: Float = 0

  mutating func process(_ input: Float) -> Float {
    let output = input * b0 + z1
    z1 = input * b1 - a1 * output + z2
    z2 = input * b2 - a2 * output
    return output
  }

  mutating func setLowShelf(sampleRate: Double, frequency: Double, gain: Float) {
    let a = pow(10, Double(gain) / 40)
    let w0 = 2 * Double.pi * frequency / sampleRate
    let alpha = sin(w0) / 2 * sqrt((a + 1 / a) * 1 + 2)
    let cosW0 = cos(w0)
    let beta = 2 * sqrt(a) * alpha
    let a0 = (a + 1) + (a - 1) * cosW0 + beta
    b0 = Float((a * ((a + 1) - (a - 1) * cosW0 + beta)) / a0)
    b1 = Float((2 * a * ((a - 1) - (a + 1) * cosW0)) / a0)
    b2 = Float((a * ((a + 1) - (a - 1) * cosW0 - beta)) / a0)
    a1 = Float((-2 * ((a - 1) + (a + 1) * cosW0)) / a0)
    a2 = Float(((a + 1) + (a - 1) * cosW0 - beta) / a0)
  }

  mutating func setPeaking(sampleRate: Double, frequency: Double, gain: Float) {
    let a = pow(10, Double(gain) / 40)
    let w0 = 2 * Double.pi * frequency / sampleRate
    let alpha = sin(w0) / (2 * 0.707)
    let cosW0 = cos(w0)
    let a0 = 1 + alpha / a
    b0 = Float((1 + alpha * a) / a0)
    b1 = Float((-2 * cosW0) / a0)
    b2 = Float((1 - alpha * a) / a0)
    a1 = Float((-2 * cosW0) / a0)
    a2 = Float((1 - alpha / a) / a0)
  }
}

@objc(CrusherEVOAudioUnit)
public final class CrusherEVOAudioUnit: AUAudioUnit {
  private let inputBus: AUAudioUnitBus
  private let outputBus: AUAudioUnitBus
  private var inputBusArray: AUAudioUnitBusArray!
  private var outputBusArray: AUAudioUnitBusArray!
  private var filters = Array(repeating: Array(repeating: Biquad(), count: 6), count: 2)
  private var sampleRate = 44100.0
  private var parameterValues = Array(repeating: Float(0), count: 7)
  private var configuredValues = Array(repeating: Float.nan, count: 7)

  public override var inputBusses: AUAudioUnitBusArray { inputBusArray }
  public override var outputBusses: AUAudioUnitBusArray { outputBusArray }

  public override var parameterTree: AUParameterTree? {
    get { parameterTreeStorage }
    set { parameterTreeStorage = newValue }
  }

  private var parameterTreeStorage: AUParameterTree?

  public override init(componentDescription: AudioComponentDescription, options: AudioComponentInstantiationOptions = []) throws {
    let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 2)!
    inputBus = try AUAudioUnitBus(format: format)
    outputBus = try AUAudioUnitBus(format: format)
    try super.init(componentDescription: componentDescription, options: options)

    inputBusArray = AUAudioUnitBusArray(audioUnit: self, busType: .input, busses: [inputBus])
    outputBusArray = AUAudioUnitBusArray(audioUnit: self, busType: .output, busses: [outputBus])
    parameterTreeStorage = makeParameterTree()
    loadSharedProfile()
  }

  private func makeParameterTree() -> AUParameterTree {
    let parameters: [AUParameter] = [
      AUParameterTree.createParameter(withIdentifier: "bassBoost", name: "Low Bass Boost", address: ParameterAddress.bassBoost.rawValue, min: 0, max: 100, unit: .percent, unitName: nil, flags: [.flag_IsReadable, .flag_IsWritable]),
      AUParameterTree.createParameter(withIdentifier: "subBass", name: "Sub-bass", address: ParameterAddress.subBass.rawValue, min: -6, max: 6, unit: .decibels, unitName: nil, flags: [.flag_IsReadable, .flag_IsWritable]),
      AUParameterTree.createParameter(withIdentifier: "band60", name: "60 Hz", address: ParameterAddress.band60.rawValue, min: -6, max: 6, unit: .decibels, unitName: nil, flags: [.flag_IsReadable, .flag_IsWritable]),
      AUParameterTree.createParameter(withIdentifier: "band150", name: "150 Hz", address: ParameterAddress.band150.rawValue, min: -6, max: 6, unit: .decibels, unitName: nil, flags: [.flag_IsReadable, .flag_IsWritable]),
      AUParameterTree.createParameter(withIdentifier: "band400", name: "400 Hz", address: ParameterAddress.band400.rawValue, min: -6, max: 6, unit: .decibels, unitName: nil, flags: [.flag_IsReadable, .flag_IsWritable]),
      AUParameterTree.createParameter(withIdentifier: "band1000", name: "1 kHz", address: ParameterAddress.band1000.rawValue, min: -6, max: 6, unit: .decibels, unitName: nil, flags: [.flag_IsReadable, .flag_IsWritable]),
      AUParameterTree.createParameter(withIdentifier: "band4000", name: "4 kHz", address: ParameterAddress.band4000.rawValue, min: -6, max: 6, unit: .decibels, unitName: nil, flags: [.flag_IsReadable, .flag_IsWritable]),
    ]
    let tree = AUParameterTree.createGroup(withIdentifier: "crusherEVO", name: "Crusher EVO S6EVW", children: parameters)
    tree.implementorValueObserver = { [weak self] parameter, value in
      self?.parameterValues[Int(parameter.address)] = value
    }
    return tree
  }

  private func loadSharedProfile() {
    guard let defaults = UserDefaults(suiteName: crusherAppGroup) else { return }
    parameterValues[ParameterAddress.bassBoost.rawValue] = defaults.float(forKey: "bassBoost")
    parameterValues[ParameterAddress.subBass.rawValue] = defaults.float(forKey: "subBass")
    if let bands = defaults.array(forKey: "bands") as? [NSNumber] {
      for (index, value) in bands.prefix(5).enumerated() {
        parameterValues[index + 2] = value.floatValue
      }
    }
    for (address, value) in parameterValues.enumerated() {
      parameterTreeStorage?.parameter(withAddress: AUParameterAddress(address))?.value = value
    }
  }

  public override func allocateRenderResources() throws {
    try super.allocateRenderResources()
    sampleRate = outputBus.format.sampleRate
    configuredValues = Array(repeating: .nan, count: 7)
    configureFiltersIfNeeded()
  }

  public override var internalRenderBlock: AUInternalRenderBlock {
    return { [weak self] actionFlags, timestamp, frameCount, outputBusNumber, outputData, realtimeEventListHead, pullInputBlock in
      guard let self else { return kAudioUnitErr_Uninitialized }
      guard let pullInputBlock else { return kAudioUnitErr_NoConnection }
      let status = pullInputBlock(actionFlags, timestamp, frameCount, 0, outputData, realtimeEventListHead)
      guard status == noErr else { return status }
      self.process(outputData, frameCount: frameCount)
      return noErr
    }
  }

  private func configureFiltersIfNeeded() {
    guard configuredValues != parameterValues else { return }
    configuredValues = parameterValues
    let bassGain = min(14, 2 + parameterValues[ParameterAddress.bassBoost.rawValue] * 0.09 + parameterValues[ParameterAddress.subBass.rawValue] * 0.4)
    let frequencies = [60.0, 150.0, 400.0, 1000.0, 4000.0]
    for channel in filters.indices {
      filters[channel][0].setLowShelf(sampleRate: sampleRate, frequency: 120, gain: bassGain)
      for index in 0..<5 {
        filters[channel][index + 1].setPeaking(sampleRate: sampleRate, frequency: frequencies[index], gain: parameterValues[index + 2])
      }
    }
  }

  private func process(_ outputData: UnsafeMutablePointer<AudioBufferList>, frameCount: AUAudioFrameCount) {
    configureFiltersIfNeeded()
    let buffers = UnsafeMutableAudioBufferListPointer(outputData)
    for bufferIndex in buffers.indices {
      guard let data = buffers[bufferIndex].mData?.assumingMemoryBound(to: Float.self) else { continue }
      let channel = min(bufferIndex, filters.count - 1)
      for frame in 0..<Int(frameCount) {
        var sample = data[frame]
        for filterIndex in filters[channel].indices {
          sample = filters[channel][filterIndex].process(sample)
        }
        data[frame] = sample
      }
    }
  }
}