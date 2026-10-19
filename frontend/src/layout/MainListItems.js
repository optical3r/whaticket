import React, { useContext, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { makeStyles } from 'tss-react/mui';
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Divider from "@mui/material/Divider";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ContactPhoneOutlinedIcon from "@mui/icons-material/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import QuestionAnswerOutlinedIcon from "@mui/icons-material/QuestionAnswerOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";

import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import { Can } from "../components/Can";

const useStyles = makeStyles()((theme, _params, classes) => ({
  navItem: {
    position: "relative",
    gap: theme.spacing(1.5),
    margin: theme.spacing(0.25, 0),
    padding: theme.spacing(1, 1.5),
    borderRadius: theme.borderRadius.small,
    color: theme.palette.text.primary,
  },
  navItemCollapsed: {
    justifyContent: "center",
    padding: theme.spacing(1, 1.25),
  },
  navItemActive: {
    color: theme.palette.text.link,
    backgroundColor: theme.palette.tintedBackground,
    "&::before": {
      content: '""',
      position: "absolute",
      top: 6,
      bottom: 6,
      left: 0,
      width: 3,
      borderRadius: theme.borderRadius.pill,
      backgroundColor: theme.palette.primary.main,
    },
    [`& .${classes.navIcon}`]: {
      color: theme.palette.text.link,
    },
    [`& .${classes.navText}`]: {
      fontWeight: 500,
    },
  },
  navIcon: {
    minWidth: 0,
    color: theme.palette.text.secondary,
  },
  navTextRoot: {
    flex: "0 1 auto",
  },
  navText: {},
  connectionDot: {
    width: 8,
    height: 8,
    flexShrink: 0,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: theme.palette.error.main,
    boxShadow: theme.border.ring,
  },
  connectionDotCollapsed: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  divider: {
    margin: theme.spacing(0.75, 1),
  },
  sectionLabel: {
    ...theme.typography.sectionLabel,
    padding: theme.spacing(1, 1.5),
  },
}));

function ListItemLink(props) {
  const { icon, primary, to, collapsed, adornment } = props;
  const { classes, cx } = useStyles();

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <NavLink
          to={to}
          exact={to === "/"}
          activeClassName={classes.navItemActive}
          ref={ref}
          {...itemProps}
        />
      )),
    [to, classes.navItemActive]
  );

  return (
    <li>
      <ListItemButton
        component={renderLink}
        className={cx(classes.navItem, collapsed && classes.navItemCollapsed)}
      >
        {icon ? (
          <ListItemIcon className={classes.navIcon}>{icon}</ListItemIcon>
        ) : null}
        {!collapsed && (
          <ListItemText
            primary={primary}
            primaryTypographyProps={{ variant: "body2", noWrap: true }}
            classes={{ root: classes.navTextRoot, primary: classes.navText }}
          />
        )}
        {adornment}
      </ListItemButton>
    </li>
  );
}

const MainListItems = (props) => {
  const { drawerClose, collapsed } = props;
  const { classes, cx } = useStyles();
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps.length > 0) {
        const offlineWhats = whatsApps.filter((whats) => {
          return (
            whats.status === "qrcode" ||
            whats.status === "PAIRING" ||
            whats.status === "DISCONNECTED" ||
            whats.status === "TIMEOUT" ||
            whats.status === "OPENING"
          );
        });
        if (offlineWhats.length > 0) {
          setConnectionWarning(true);
        } else {
          setConnectionWarning(false);
        }
      }
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [whatsApps]);

  return (
    <div onClick={drawerClose}>
      <ListItemLink
        to="/"
        primary="Dashboard"
        icon={<DashboardOutlinedIcon />}
        collapsed={collapsed}
      />
      <ListItemLink
        to="/connections"
        primary={i18n.t("mainDrawer.listItems.connections")}
        icon={<SyncAltIcon />}
        collapsed={collapsed}
        adornment={
          connectionWarning && (
            <span
              className={cx(
                classes.connectionDot,
                collapsed && classes.connectionDotCollapsed
              )}
            />
          )
        }
      />
      <ListItemLink
        to="/tickets"
        primary={i18n.t("mainDrawer.listItems.tickets")}
        icon={<WhatsAppIcon />}
        collapsed={collapsed}
      />
      <ListItemLink
        to="/kanban"
        primary={i18n.t("mainDrawer.listItems.kanban")}
        icon={<ViewKanbanOutlinedIcon />}
        collapsed={collapsed}
      />

      <ListItemLink
        to="/contacts"
        primary={i18n.t("mainDrawer.listItems.contacts")}
        icon={<ContactPhoneOutlinedIcon />}
        collapsed={collapsed}
      />
      <ListItemLink
        to="/quickAnswers"
        primary={i18n.t("mainDrawer.listItems.quickAnswers")}
        icon={<QuestionAnswerOutlinedIcon />}
        collapsed={collapsed}
      />
      <Can
        role={user.profile}
        perform="drawer-manager-items:view"
        yes={() => (
          <>
            <Divider className={classes.divider} />
            {!collapsed && (
              <ListSubheader disableSticky className={classes.sectionLabel}>
                {i18n.t("mainDrawer.listItems.administration")}
              </ListSubheader>
            )}
            <Can
              role={user.profile}
              perform="reports:view"
              yes={() => (
                <ListItemLink
                  to="/reports"
                  primary={i18n.t("mainDrawer.listItems.reports")}
                  icon={<AssessmentOutlinedIcon />}
                  collapsed={collapsed}
                />
              )}
            />
            <Can
              role={user.profile}
              perform="drawer-admin-items:view"
              yes={() => (
                <>
                  <ListItemLink
                    to="/users"
                    primary={i18n.t("mainDrawer.listItems.users")}
                    icon={<PeopleAltOutlinedIcon />}
                    collapsed={collapsed}
                  />
                  <ListItemLink
                    to="/queues"
                    primary={i18n.t("mainDrawer.listItems.queues")}
                    icon={<AccountTreeOutlinedIcon />}
                    collapsed={collapsed}
                  />
                </>
              )}
            />
            <Can
              role={user.profile}
              perform="tags:manage"
              yes={() => (
                <ListItemLink
                  to="/tags"
                  primary={i18n.t("mainDrawer.listItems.tags")}
                  icon={<LabelOutlinedIcon />}
                  collapsed={collapsed}
                />
              )}
            />
            <Can
              role={user.profile}
              perform="closeReasons:manage"
              yes={() => (
                <ListItemLink
                  to="/closeReasons"
                  primary={i18n.t("mainDrawer.listItems.closeReasons")}
                  icon={<AssignmentTurnedInOutlinedIcon />}
                  collapsed={collapsed}
                />
              )}
            />
            <Can
              role={user.profile}
              perform="webhooks:manage"
              yes={() => (
                <ListItemLink
                  to="/webhooks"
                  primary={i18n.t("mainDrawer.listItems.webhooks")}
                  icon={<SettingsEthernetIcon />}
                  collapsed={collapsed}
                />
              )}
            />
            <Can
              role={user.profile}
              perform="ai:manage"
              yes={() => (
                <ListItemLink
                  to="/ai"
                  primary={i18n.t("mainDrawer.listItems.ai")}
                  icon={<AutoAwesomeOutlinedIcon />}
                  collapsed={collapsed}
                />
              )}
            />
            <Can
              role={user.profile}
              perform="drawer-admin-items:view"
              yes={() => (
                <ListItemLink
                  to="/settings"
                  primary={i18n.t("mainDrawer.listItems.settings")}
                  icon={<SettingsOutlinedIcon />}
                  collapsed={collapsed}
                />
              )}
            />
          </>
        )}
      />
      {user.super && (
        <>
          <Divider className={classes.divider} />
          {!collapsed && (
            <ListSubheader disableSticky className={classes.sectionLabel}>
              {i18n.t("mainDrawer.listItems.platform")}
            </ListSubheader>
          )}
          <ListItemLink
            to="/companies"
            primary={i18n.t("mainDrawer.listItems.companies")}
            icon={<BusinessOutlinedIcon />}
            collapsed={collapsed}
          />
          <ListItemLink
            to="/plans"
            primary={i18n.t("mainDrawer.listItems.plans")}
            icon={<LocalOfferOutlinedIcon />}
            collapsed={collapsed}
          />
        </>
      )}
    </div>
  );
};

export default MainListItems;
