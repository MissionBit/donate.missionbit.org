import { withStyles } from "@material-ui/core/styles";
import MuiButton, { ButtonTypeMap } from "@material-ui/core/Button";
import { ssBrand } from "src/colors";
import { ExtendButtonBase } from "@material-ui/core/ButtonBase";
import buttonStyles from "src/buttonStyles";

export const IndigoButton = withStyles(buttonStyles(ssBrand.purple))(
  MuiButton
) as ExtendButtonBase<ButtonTypeMap>;

export default IndigoButton;
