
import {AppProps} from "next/app"
import "primereact/resources/primereact.min.css";
import "primeflex/primeflex.css";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "primeicons/primeicons.css";
import { Provider } from "react-redux";
import { store } from "@/state/store";

// Import your custom components or layout components
function MyApp({ Component, pageProps }:AppProps) {
  // Additional setup or global configurations can be added here
  return (
    <Provider store={store}>
      <Component {...pageProps} />
    </Provider>
  );
}

export default MyApp;
