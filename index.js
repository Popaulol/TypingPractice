const get_JSON = async url => {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(response.statusText);

    const data = response.json();
    return data;
}

function choose(choices) {
    var index = Math.floor(Math.random() * choices.length);
    return choices[index];
}





document.addEventListener("DOMContentLoaded", async () => {
    // Globals
    let text = []
    let start_time
    let last_char_time
    let current_character = 0
    let current_mistake = false
    let current_run_data = []

    // Elements
    let language_select = document.getElementById("language");
    let text_length = document.getElementById("length");
    let text_area = document.getElementById("text");
    let new_text_button = document.getElementById("new_text");
    let reset_run_button = document.getElementById("reset_run")

    // Functions

    const generate_text = () => {
        const length = text_length.value
        const language = language_select.options[language_select.selectedIndex].text;

        get_JSON(`https://random-word-api.herokuapp.com/word?number=${length}&lang=${language}`).then(
            (content) => {
                current_character = 0
                text_area.textContent = ""
                text = []
                if (length == 1 && content[0].length == 1) content.push(content[0])
                content.forEach(
                    (word) => {
                        for (const c of word) {
                            let span = document.createElement("span");
                            span.innerText = c
                            text_area.appendChild(span)
                            text.push(span)

                        }
                        let span = document.createElement("span");
                        span.innerText = " "
                        text_area.appendChild(span)
                        text.push(span)
                    }
                )
                text[0].classList.add("current")
                document.addEventListener("keydown", start_practice)
            }
        )

        console.trace()
    }

    const start_practice = (e) => {
        const key = e.key;
        if (key.length != 1) return // We are dealing with a modifer Key

        if (key != text[0].innerText) return

        current_character = 1
        text[0].classList.remove("current")
        text[0].classList.add("correct")
        text[1].classList.add("current")
        start_time = (new Date()).getTime()
        last_char_time = (new Date()).getTime()
        current_mistake = false

        document.removeEventListener("keydown", start_practice)
        document.addEventListener("keydown", continue_practice)

    }

    const reset_run = () => {
        for (char of text) {
            char.classList.remove("correct")
            char.classList.remove("wrong")
            char.classList.remove("current")
        }

        text[0].classList.remove("current")

        current_character = 0
        current_mistake = false

        current_run_data = []

        document.removeEventListener("keydown", start_practice)
        document.addEventListener("keydown", continue_practice)
    }


    const continue_practice = (e) => {
        const current_time = (new Date()).getTime()
        const key = e.key;
        console.log(key)
        if (key.length != 1) return // We are dealing with a modifer Key

        if (key == text[current_character].innerText) {

            text[current_character].classList.remove("current")

            if (current_mistake)
                text[current_character].classList.add("wrong")
            else text[current_character].classList.add("correct")

            if (current_character + 1 == text.length - 1) {
                let runs = JSON.parse(localStorage.getItem("runs"));

                runs.push(
                    {
                        time: current_time - start_time,
                        data: current_run_data,
                        length: text_length.value
                    }
                )
                console.log(runs)
                localStorage.setItem("runs", JSON.stringify(runs))

                document.removeEventListener("keydown", continue_practice)
                document.addEventListener("keydown", start_practice)
                generate_text()
                return
            }

            text[current_character + 1].classList.add("current")

            current_run_data.push(
                {
                    time: current_time - last_char_time,
                    char: key,
                    mistake: current_mistake,
                }
            )

            last_char_time = current_time

            current_character += 1
            current_mistake = false
            // console.log(localStorage)
        } else {
            current_mistake = true
        }


    }

    // Initial setup

    // Spacebar shan't scroll the page
    window.addEventListener('keydown', function () { if (event.keyCode == 32) { document.body.style.overflow = "hidden"; } });
    window.addEventListener('keyup', function () { if (event.keyCode == 32) { document.body.style.overflow = "auto"; } });

    if (!localStorage.getItem("runs")) localStorage.setItem("runs", "[]")
    reset_run_button.addEventListener("click", reset_run)

    get_JSON("https://random-word-api.herokuapp.com/languages").then(languages => {
        languages.sort()
        languages.forEach(element => {
            let option = document.createElement("option");
            option.text = element
            language_select.add(option)
        }
        );

        new_text_button.addEventListener("click", generate_text)
        generate_text()
    })

})
