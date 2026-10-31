// Google Cast arrastra versiones nuevas (mediarouter 1.9 beta, cast-framework 23
// con Kotlin 2.4) que exigen compileSdk 37/AGP 9; Expo SDK 54 no los soporta.
const { withProjectBuildGradle } = require('expo/config-plugins');

const MARK = '// mediarouter-pin';

module.exports = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARK)) {
      cfg.modResults.contents += `\n${MARK}\nsubprojects {\n  configurations.all {\n    resolutionStrategy.force 'androidx.mediarouter:mediarouter:1.7.0'\n    resolutionStrategy.force 'com.google.android.gms:play-services-cast-framework:21.5.0'\n    resolutionStrategy.force 'com.google.android.gms:play-services-cast:21.5.0'\n  }\n}\n`;
    }
    return cfg;
  });
