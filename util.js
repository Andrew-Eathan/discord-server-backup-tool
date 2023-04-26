import readline from "readline-sync"

export function cmdGetNumber(validate) {
	for (; ;) {
		let key = Number(readline.question("> "))

		if (key != key) {
			console.log("Insert a number!")
			continue;
		}

		if (validate(key)) {
			return key;
		} else console.log("Data not accepted, check if it's within bounds!")
	}
}

export function cmdGetString(validate) {
	for (; ;) {
		let key = readline.question("> ").toString()
		if (key.length == 0) {
			console.log("Please type the required data.")
			continue;
		}

		if (validate(key)) {
			return key;
		}
		else {
			console.log("Data not accepted, please type what the program asks above")
		}
	}
}

