import { alpha, createTheme } from "@mui/material/styles";

import palette from "./palette";

const borderRadius = {
  small: "8px",
  medium: "16px",
  input: "10px",
  table: "12px",
  pill: "999px",
};

const fonts = {
  body: '"Inter", "Helvetica", "Arial", sans-serif',
  brand: '"Sora", "Inter", "Helvetica", "Arial", sans-serif',
  mono: '"IBM Plex Mono", "SFMono-Regular", "Consolas", monospace',
};

const headings = ["h1", "h2", "h3", "h4", "h5", "h6"].reduce(
  (styles, variant) => ({
    ...styles,
    [variant]: { fontFamily: fonts.brand, fontWeight: 600 },
  }),
  {}
);

const createAppTheme = (mode) => {
  const colors = palette[mode];
  const isDark = mode === "dark";
  const { palette: basePalette } = createTheme({ palette: { mode, ...colors } });
  const shadowColor = (opacity) =>
    alpha(basePalette.common.black, isDark ? opacity * 2 : opacity);

  return createTheme({
    palette: {
      mode,
      ...colors,
      tintedBackground: alpha(colors.primary.main, isDark ? 0.08 : 0.04),
    },

    typography: {
      fontFamily: fonts.body,
      brandFontFamily: fonts.brand,
      monoFontFamily: fonts.mono,
      ...headings,
      button: { fontWeight: 600 },
      sectionLabel: {
        fontSize: "12px",
        fontWeight: 700,
        lineHeight: 1.4,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: basePalette.text.secondary,
      },
    },

    borderRadius,

    sizing: {
      appBar: 54,
    },

    border: {
      divider: `1px solid ${basePalette.divider}`,
      ring: `0 0 0 2px ${colors.background.paper}`,
    },

    elevation: {
      light: `0 2px 6px -2px ${shadowColor(0.25)}`,
    },

    scrollbarStyles: {
      "&::-webkit-scrollbar": {
        width: "8px",
        height: "8px",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: colors.scrollbar.thumb,
      },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "*:focus-visible": {
            outline: `2px solid ${colors.focusRing}`,
            outlineOffset: 2,
          },
          a: {
            color: colors.text.link,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.input,
            fontSize: "14px",
            fontWeight: 600,
            textTransform: "none",
          },
          outlined: {
            backgroundColor: colors.cards.background,
            borderColor: colors.border.strong,
          },
        },
      },
      // Primary-colored text uses the link token so it keeps AA contrast
      // on both themes; action-primary is reserved for filled controls.
      MuiTypography: {
        styleOverrides: {
          root: {
            "&.MuiTypography-colorPrimary": { color: colors.text.link },
          },
        },
        variants: [
          {
            props: { color: "primary" },
            style: { color: colors.text.link },
          },
        ],
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.input,
            backgroundColor: colors.cards.background,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: borderRadius.input,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            color: colors.text.primary,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          outlined: {
            "&.MuiPaper-rounded": {
              borderRadius: borderRadius.medium,
            },
          },
        },
      },
    },
  });
};

export default createAppTheme;
