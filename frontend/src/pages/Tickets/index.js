import React from "react";
import { useParams } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import { makeStyles } from 'tss-react/mui';

import TicketsManager from "../../components/TicketsManager/";
import Ticket from "../../components/Ticket/";

import { i18n } from "../../translate/i18n";
import Box from "@mui/material/Box";

const useStyles = makeStyles()((theme) => ({
  chatContainer: {
    flex: 1,
    // // backgroundColor: "#eee",
    // padding: theme.spacing(4),
    height: `calc(100% - ${theme.sizing.appBar}px)`,
    overflowY: "hidden",
    backgroundColor: theme.palette.background.default,
    [theme.breakpoints.up("sm")]: {
      padding: theme.spacing(2),
    },
  },

  chatPapper: {
    // backgroundColor: "red",
    display: "flex",
    height: "100%",
  },

  contactsWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
  },
  contactsWrapperSmall: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
    [theme.breakpoints.down('md')]: {
      display: "none",
    },
  },
  messagessWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    [theme.breakpoints.up("md")]: {
      paddingLeft: theme.spacing(2),
    },
  },
  welcomeMsg: {
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    justifyContent: "space-evenly",
    alignItems: "center",
    height: "100%",
    textAlign: "center",
  },
  ticketsManager: {},
  ticketsManagerClosed: {
    [theme.breakpoints.down('md')]: {
      display: "none",
    },
  },
}));

const Chat = () => {
  const { classes } = useStyles();
  const { ticketId } = useParams();

  return (
    <div className={classes.chatContainer}>
      <div className={classes.chatPapper}>
        <Grid container spacing={0}>
          {/* <Grid size={{ xs: 4 }} className={classes.contactsWrapper}> */}
          <Grid size={{ xs: 12, md: 4 }}
            className={
              ticketId ? classes.contactsWrapperSmall : classes.contactsWrapper
            }
          >
            <TicketsManager />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }} className={classes.messagessWrapper}>
            {/* <Grid size={{ xs: 8 }} className={classes.messagessWrapper}> */}
            {ticketId ? (
              <>
                <Ticket />
              </>
            ) : (
              <Box sx={{ display: { xs: "none", md: "contents" } }}>
                <Paper variant="outlined" className={classes.welcomeMsg}>
                  {/* <Paper square variant="outlined" className={classes.welcomeMsg}> */}
                  <span>{i18n.t("chat.noTicketMessage")}</span>
                </Paper>
              </Box>
            )}
          </Grid>
        </Grid>
      </div>
    </div>
  );
};

export default Chat;
