import inquirer from "inquirer";
import type { IDataLayer } from "../data";

export async function login(dataLayer: IDataLayer) {
    try {
        if (dataLayer.isLoggedIn()) {
            console.log('Already logged in');
            return;
        }

        const answers = await inquirer.prompt([
            { type: 'input', message: 'Email', name: 'email', validate(value){ return value.length > 0; } },
            { type: 'password', message: 'Password', name: 'password', validate(value){ return value.length > 0; } }
        ]);

        if (answers.email && answers.password) {
            if (await dataLayer.login(answers.email, answers.password)) {
                console.log(`Successfully logged in as ${answers.email}`);
            } else {
                console.log('Unable to log in')
            }
        } else {
            console.error('Email or password invalid');
        }
    } catch (error : any) {
        if (error.isTtyError) {
            console.log('Prompt is not available in this environment')
        } else {
            console.log('Unable to ask about login info')
        }
    }
}