Pod::Spec.new do |s|
  s.name           = 'CrusherAudioUnit'
  s.version        = '1.0.0'
  s.summary        = 'Crusher EVO audio session and Bluetooth analysis module'
  s.description    = 'Native Expo module for Bluetooth route detection and read-only BLE analysis.'
  s.author         = 'Crusher EVO Boost'
  s.platforms      = { :ios => '16.4' }
  s.source         = { :git => 'https://github.com/fact3029/1.git', :branch => 'main' }
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency     'ExpoModulesCore'
  s.frameworks     = ['AVFoundation', 'CoreBluetooth']
end