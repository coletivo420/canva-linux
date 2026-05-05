import themeConfig from '../theme.json';

type BlessedColor = string;
const supportsTrueColor = process.env.COLORTERM === 'truecolor' || process.env.COLORTERM === '24bit';
const colors = {
  lightBlue: supportsTrueColor ? themeConfig.palette.canvaLightBlue : themeConfig.ansiFallback.primary,
  blue: supportsTrueColor ? themeConfig.palette.canvaLightBlue : themeConfig.ansiFallback.secondary,
  purple: supportsTrueColor ? themeConfig.palette.canvaPurple : themeConfig.ansiFallback.accent,
  success: supportsTrueColor ? themeConfig.palette.success : themeConfig.ansiFallback.success,
  warning: supportsTrueColor ? themeConfig.palette.warning : themeConfig.ansiFallback.warning,
  error: supportsTrueColor ? themeConfig.palette.error : themeConfig.ansiFallback.error,
  text: supportsTrueColor ? themeConfig.palette.text : 'white', muted: supportsTrueColor ? themeConfig.palette.muted : 'gray',
  background: supportsTrueColor ? themeConfig.palette.background : 'black', surface: supportsTrueColor ? themeConfig.palette.surface : 'black',
  surfaceAlt: supportsTrueColor ? themeConfig.palette.surfaceAlt : 'black',
  selectionBg: supportsTrueColor ? themeConfig.palette.canvaLightBlue : 'blue',
  selectionFg: 'white',
  footerBg: supportsTrueColor ? themeConfig.palette.canvaLightBlue : 'blue',
  footerFg: 'white',
  logo: supportsTrueColor ? themeConfig.palette.canvaLightBlue : themeConfig.ansiFallback.secondary,
  version: supportsTrueColor ? themeConfig.palette.canvaLightBlue : themeConfig.ansiFallback.secondary,
  phase: supportsTrueColor ? themeConfig.palette.warning : themeConfig.ansiFallback.warning,
  nativeDetected: supportsTrueColor ? themeConfig.palette.canvaLightBlue : themeConfig.ansiFallback.secondary,
  flatpakNotDetected: supportsTrueColor ? themeConfig.palette.canvaLightBlue : themeConfig.ansiFallback.primary,
  appImageLoading: supportsTrueColor ? themeConfig.palette.warning : themeConfig.ansiFallback.warning,
};
export const tuiTheme = {
  supportsTrueColor, colors,
  header: { fg: colors.lightBlue as BlessedColor, bg: colors.background as BlessedColor, bold: true },
  menu: { fg: colors.text as BlessedColor, bg: colors.background as BlessedColor, border: { fg: colors.blue as BlessedColor }, selected: { fg: colors.selectionFg as BlessedColor, bg: colors.selectionBg as BlessedColor, bold: true }, item: { fg: colors.text as BlessedColor } },
  content: { fg: colors.text as BlessedColor, bg: colors.background as BlessedColor, border: { fg: colors.purple as BlessedColor }, label: { fg: colors.lightBlue as BlessedColor } },
  logs: { fg: colors.text as BlessedColor, bg: colors.background as BlessedColor, border: { fg: colors.blue as BlessedColor }, label: { fg: colors.lightBlue as BlessedColor } },
  footer: { fg: colors.footerFg as BlessedColor, bg: colors.footerBg as BlessedColor, bold: true },
  modal: { normalBorder: colors.lightBlue as BlessedColor, dangerousBorder: colors.error as BlessedColor, text: colors.text as BlessedColor, background: colors.background as BlessedColor },
};
