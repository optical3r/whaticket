import React, { useState, useContext } from "react";

import {
  Button,
  CssBaseline,
  TextField,
  Box,
  Typography,
  Container,
  InputAdornment,
  IconButton
} from '@mui/material';

import { Visibility, VisibilityOff } from '@mui/icons-material';

import { useTheme } from "@mui/material/styles";

import { makeStyles } from 'tss-react/mui';

import { i18n } from "../../translate/i18n";

import { AuthContext } from "../../context/Auth/AuthContext";
import { getLogoFor } from "../../brand";
import LanguageSelector from "../../components/LanguageSelector";

// const Copyright = () => {
// 	return (
// 		<Typography variant="body2" color="textSecondary" align="center">
// 			{"Copyleft "}
// 			<Link color="inherit" href="https://github.com/canove">
// 				Canove
// 			</Link>{" "}
// 			{new Date().getFullYear()}
// 			{"."}
// 		</Typography>
// 	);
// };

const useStyles = makeStyles()((theme) => ({
  languageSelector: {
    position: "absolute",
    top: theme.spacing(2),
    right: theme.spacing(2),
  },
  paper: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logo: {
    width: "75%",
    marginBottom: theme.spacing(3),
    [theme.breakpoints.down('md')]: {
      width: "95%",
    },
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
}));

const Login = () => {
  const { classes } = useStyles();
  const theme = useTheme();

  const [user, setUser] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const { handleLogin } = useContext(AuthContext);

  const handleChangeInput = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handlSubmit = (e) => {
    e.preventDefault();
    handleLogin(user);
  };

  const logo = getLogoFor(theme.palette.mode);

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.languageSelector}>
        <LanguageSelector />
      </div>
      <div className={classes.paper}>
        <img src={logo} alt="Cerqueira Labs" className={classes.logo} />
        <Typography component="h1" variant="h5">
          {i18n.t("login.title")}
        </Typography>
        <form className={classes.form} noValidate onSubmit={handlSubmit}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label={i18n.t("login.form.email")}
            name="email"
            value={user.email}
            onChange={handleChangeInput}
            autoComplete="email"
            autoFocus
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            label={i18n.t("login.form.password")}
            id="password"
            value={user.password}
            onChange={handleChangeInput}
            autoComplete="current-password"
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword((e) => !e)}
                    size="large">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            {i18n.t("login.buttons.submit")}
          </Button>
        </form>
      </div>
      <Box mt={8}>{/* <Copyright /> */}</Box>
    </Container>
  );
};

export default Login;
