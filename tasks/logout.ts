import inquirer from "inquirer";
import type { IDataLayer } from "../data";

export async function logout(dataLayer: IDataLayer) {
    try {
        if (!dataLayer.isLoggedIn()) {
            console.log('Not logged in');
            return;
        }

        if (confirm('Are you sure you want to log out from registry')) {
            if (await dataLayer.logout()) {
                console.log('Logged out from registry successfully');
            } else {
                console.log('Unable to log out from registry');
            }
        } else {
            console.log('Skipped logout')
        }
    } catch (error : any) {
        if (error.isTtyError) {
            console.log('Prompt is not available in this environment')
        } else {
            console.log('Unable to ask about login info')
        }
    }
}