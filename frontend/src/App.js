import React, { useEffect } from "react";
import Routes from "./routes";
import brand from "./brand";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  useEffect(() => {
    document.title = brand.name;
  }, []);

  return <Routes />;
};

export default App;
