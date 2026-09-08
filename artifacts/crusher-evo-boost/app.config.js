const AUDIO_UNIT_PLUGIN = './plugins/withAudioUnitExtension';

module.exports = ({ config }) => {
  const isSideloadBuild = process.env.SIDELOAD_BUILD === '1';

  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier || 'com.crusherevo.boost',
    },
    plugins: isSideloadBuild
      ? (config.plugins || []).filter((plugin) => {
          const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
          return pluginName !== AUDIO_UNIT_PLUGIN;
        })
      : config.plugins,
    extra: {
      ...config.extra,
      distribution: isSideloadBuild ? 'sideloadly' : 'standard',
    },
  };
};