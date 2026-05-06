export { PowerManagementAPI } from "./PowerManagementAPI.js";
export { PowerManagementUI } from "./PowerManagementUI.js";
export { PowerManagementTV } from "./PowerManagementTV.js";
export { PowerManagementState } from "./PowerManagementState.js";
import { PowerManagement } from "./PowerManagement.js";

export function initPowerManagement(api, events, options) {
  const container = document.getElementById("pageContainer");
  const powerManagement = new PowerManagement(api, events, {
    container: container,
    tvAddress: options?.tvAddress || "192.168.50.13",
  });
  return powerManagement;
}
