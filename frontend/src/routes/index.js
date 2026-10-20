import React from "react";
import { BrowserRouter, Switch } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";
import Dashboard from "../pages/Dashboard/";
import Tickets from "../pages/Tickets/";
import Login from "../pages/Login/";
import Connections from "../pages/Connections/";
import Settings from "../pages/Settings/";
import Users from "../pages/Users";
import Contacts from "../pages/Contacts/";
import QuickAnswers from "../pages/QuickAnswers/";
import Queues from "../pages/Queues/";
import Companies from "../pages/Companies/";
import Plans from "../pages/Plans/";
import Tags from "../pages/Tags/";
import CloseReasons from "../pages/CloseReasons/";
import Reports from "../pages/Reports/";
import Webhooks from "../pages/Webhooks/";
import Ai from "../pages/Ai/";
import Kanban from "../pages/Kanban/";
import Campaigns from "../pages/Campaigns/";
import Flows from "../pages/Flows/";
import FlowEditor from "../pages/FlowEditor/";
import Transcription from "../pages/Transcription/";
import { AuthProvider } from "../context/Auth/AuthContext";
import { WhatsAppsProvider } from "../context/WhatsApp/WhatsAppsContext";
import { ThemeProvider } from "../context/DarkMode";
import Route from "./Route";

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
          <ThemeProvider>
            <Switch>
              <Route exact path="/login" component={Login} />
              <WhatsAppsProvider>
                <LoggedInLayout>
                  <Route exact path="/" component={Dashboard} isPrivate />
                  <Route exact path="/tickets/:ticketId?" component={Tickets} isPrivate />
                  <Route exact path="/connections" component={Connections} isPrivate />
                  <Route exact path="/contacts" component={Contacts} isPrivate />
                  <Route exact path="/users" component={Users} isPrivate />
                  <Route exact path="/quickAnswers" component={QuickAnswers} isPrivate />
                  <Route exact path="/Settings" component={Settings} isPrivate />
                  <Route exact path="/Queues" component={Queues} isPrivate />
                  <Route exact path="/companies" component={Companies} isPrivate />
                  <Route exact path="/plans" component={Plans} isPrivate />
                  <Route exact path="/tags" component={Tags} isPrivate />
                  <Route exact path="/closeReasons" component={CloseReasons} isPrivate />
                  <Route exact path="/reports" component={Reports} isPrivate />
                  <Route exact path="/webhooks" component={Webhooks} isPrivate />
                  <Route exact path="/ai" component={Ai} isPrivate />
                  <Route exact path="/kanban" component={Kanban} isPrivate />
                  <Route exact path="/campaigns" component={Campaigns} isPrivate />
                  <Route exact path="/flows" component={Flows} isPrivate />
                  <Route exact path="/flows/:flowId" component={FlowEditor} isPrivate />
                  <Route exact path="/transcription" component={Transcription} isPrivate />
                </LoggedInLayout>
              </WhatsAppsProvider>
            </Switch>
            <ToastContainer autoClose={3000} />
          </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
