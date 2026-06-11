import {AppRegistry} from 'react-native';
import {registerWidgetTaskHandler} from 'react-native-android-widget';
import App from './src/App';
import {widgetTaskHandler} from './src/widget/WeatherWidget';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
registerWidgetTaskHandler(widgetTaskHandler);
