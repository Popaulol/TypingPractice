const get_JSON = async url => {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(response.statusText);

    const data = response.json();
    return data;
}

const is_today = (someDate) => {
    const today = new Date()
    return someDate.getDate() == today.getDate() &&
        someDate.getMonth() == today.getMonth() &&
        someDate.getFullYear() == today.getFullYear()
}

function download(text, name, type) {
    const a = document.createElement('a');
    a.style.display = 'none';

    let file = new Blob([text], { type: type });
    const url = URL.createObjectURL(file);
    a.href = url
    a.download = name;

    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
}

function round_to_places(num, places) {
    const factor = Math.pow(10, places)
    return Math.round((num + Number.EPSILON) * factor) / factor
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
    let last_run_time = document.getElementById("last_run_time")
    let last_run_cpm = document.getElementById("last_run_cpm")
    let last_run_wrong_chars = document.getElementById("last_run_wrong_chars")
    let total_run_count = document.getElementById("total_run_count")
    let total_chars_typed = document.getElementById("total_chars_typed")
    let total_time = document.getElementById("total_time")
    let total_cpm = document.getElementById("total_cpm")
    let total_wrong_chars = document.getElementById("total_wrong_chars")
    let today_run_count = document.getElementById("today_run_count")
    let today_chars_typed = document.getElementById("today_chars_typed")
    let today_time = document.getElementById("today_time")
    let today_cpm = document.getElementById("today_cpm")
    let today_wrong_chars = document.getElementById("today_wrong_chars")
    let save_button = document.getElementById("save_button")
    let save_upload = document.getElementById("load_data")
    let delete_today = document.getElementById("delete_today")
    let delete_everything = document.getElementById("delete_everything")
    let stat_div = document.getElementById("stats")
    let no_stats = document.getElementById("no_stats")
    let report_button = document.getElementById("report")
    let report_table = document.getElementById("detailed_report")

    // Functions

    const generate_text = () => {
        const length = text_length.value
        const language = language_select.options[language_select.selectedIndex].text;

        get_JSON(`https://random-word-api.herokuapp.com/word?number=${length}&lang=${language}`).then(
            (content) => {
                current_character = 0
                text_area.textContent = ""
                text = []
                current_run_data = []
                if (length == 1 && content[0].length == 1) content.push(content[0])
                content.forEach(
                    (word) => {
                        for (let c of word) {
                            // Any Keys not found as a single key on a keyboard result in softlocks, so we just replace any we know about with alternatives
                            if (c == "~") c = "-"
                            else if (c == "è") c = "e"
                            else if (c == "é") c = "e"
                            let span = document.createElement("span");
                            span.innerText = c
                            text_area.appendChild(span)
                            text.push({ span: span, char: c })

                        }
                        let span = document.createElement("span");
                        span.innerHTML = "&nbsp;&ZeroWidthSpace;"
                        text_area.appendChild(span)
                        text.push({ span: span, char: " " })
                    }
                )
                text[0].span.classList.add("current")
                document.removeEventListener("keydown", continue_practice)
                document.addEventListener("keydown", start_practice)


            }
        )

        console.trace()
    }

    const start_practice = (e) => {
        const key = e.key;
        if (key.length != 1) return // We are dealing with a modifer Key

        if (key != text[0].char) return

        current_character = 1
        text[0].span.classList.remove("current")
        text[0].span.classList.add("correct")
        text[1].span.classList.add("current")
        start_time = (new Date()).getTime()
        last_char_time = (new Date()).getTime()
        current_mistake = false

        document.removeEventListener("keydown", start_practice)
        document.addEventListener("keydown", continue_practice)

    }

    const reset_run = () => {
        for (span of text) {
            span.span.classList.remove("correct")
            span.span.classList.remove("wrong")
            span.span.classList.remove("current")
        }

        text[0].span.classList.add("current")

        current_character = 0
        current_mistake = false

        current_run_data = []

        document.addEventListener("keydown", start_practice)
        document.removeEventListener("keydown", continue_practice)
    }


    const continue_practice = (e) => {
        const current_time = (new Date()).getTime()
        const key = e.key;
        console.log(key)
        if (key.length != 1) return // We are dealing with a modifer Key
        e.preventDefault()
        if (key == text[current_character].char) {

            text[current_character].span.classList.remove("current")

            if (current_mistake)
                text[current_character].span.classList.add("wrong")
            else text[current_character].span.classList.add("correct")

            if (current_character + 1 == text.length - 1) {
                let runs = JSON.parse(localStorage.getItem("runs"));

                runs.push(
                    {
                        date: Date(),
                        time: current_time - start_time,
                        data: current_run_data,
                    }
                )
                console.log(runs)
                localStorage.setItem("runs", JSON.stringify(runs))

                document.removeEventListener("keydown", continue_practice)
                document.addEventListener("keydown", start_practice)
                generate_text()
                return
            }

            text[current_character + 1].span.classList.add("current")

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

    const analyse_single_run = (run) => {

        const char_count = run.data.length

        const cpms = char_count / run.time
        const cps = cpms * 1000
        const cpm = cps * 60

        const mistake_count = run.data.filter(x => x.mistake).length
        // console.log(mistake_count)
        return {
            time: run.time,
            cpm: cpm,
            mistake_percentage: mistake_count / char_count,
        }
    }

    const analyse_multiple_runs = (runs) => {
        let data = []
        let time = 0
        for (run of runs) {
            data.push(...run.data)
            time += run.time
        }

        // console.log(data)

        const part_anal = analyse_single_run({
            data: data,
            time: time
        })

        return {
            time: time,
            cpm: part_anal.cpm,
            mistake_percentage: part_anal.mistake_percentage,
            run_count: runs.length,
            char_count: data.length,
        }
    }

    const refresh_stats = () => {
        const runs = JSON.parse(localStorage.getItem("runs"));
        if (runs.length == 0) {
            no_stats.classList.remove("invisible")
            stat_div.classList.add("invisible")
            console.log("Blub")
            return
        }

        no_stats.classList.add("invisible")
        stat_div.classList.remove("invisible")

        // Last Run
        const last_run = runs.at(-1)
        const last_run_anal = analyse_single_run(last_run)

        // console.log(last_run)

        last_run_time.innerText = `${last_run_anal.time / 1000}s`
        last_run_cpm.innerText = `${last_run_anal.cpm}`
        last_run_wrong_chars.innerText = `${last_run_anal.mistake_percentage * 100}%`

        // Todays runs
        let todays_runs = []
        for (run of runs) {
            if (!run.date) continue
            const run_date = new Date(run.date)
            if (is_today(run_date))
                todays_runs.push(run)

        }
        const today_anal = analyse_multiple_runs(todays_runs)
        today_run_count.innerText = `${today_anal.run_count}`
        today_chars_typed.innerText = `${today_anal.char_count}`
        today_time.innerText = `${today_anal.time / 1000}s`
        today_cpm.innerText = `${today_anal.cpm}`
        today_wrong_chars.innerText = `${today_anal.mistake_percentage * 100}%`

        // All runs
        const full_anal = analyse_multiple_runs(runs)
        total_run_count.innerText = `${full_anal.run_count}`
        total_chars_typed.innerText = `${full_anal.char_count}`
        total_time.innerText = `${full_anal.time / 1000}s`
        total_cpm.innerText = `${full_anal.cpm}`
        total_wrong_chars.innerText = `${full_anal.mistake_percentage * 100}%`

    }

    const character_report = () => {
        const runs = JSON.parse(localStorage.getItem("runs"));
        let char_map = {}

        let tablebody = document.createElement("tbody")

        for (run of runs) {
            for (char of run.data) {
                if (char_map[char.char])
                    char_map[char.char].push(char)
                else char_map[char.char] = [char]
            }
        }

        console.log(char_map)
        const keys = Object.keys(char_map)
        keys.sort()

        for (key of keys) {
            let row = document.createElement("tr")

            const create_cell = (text) => {
                let cell = document.createElement("td")
                let cell_text = document.createTextNode(text)
                cell.appendChild(cell_text)
                row.appendChild(cell)

                return text
            }

            create_cell(`\`${key}\`: `)
            let chars = char_map[key]
            let total_time = 0
            let mistakes = 0
            for (char of chars) {
                total_time += char.time
                if (char.mistake) mistakes += 1
            }
            const error_rate = mistakes / chars.length * 100
            const average_time = total_time / chars.length
            create_cell(`${chars.length}`)
            create_cell(`${mistakes}`)
            create_cell(`${round_to_places(error_rate, 2)}%`)
            create_cell(`${round_to_places(average_time, 2)}ms`)

            tablebody.appendChild(row)

        }

        report_table.removeChild(report_table.tBodies[0])
        report_table.appendChild(tablebody)
        // alert(report)
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

    setInterval(refresh_stats, 100)
    refresh_stats()

    save_button.addEventListener("click", () => {
        download(
            localStorage.getItem("runs"), "TypingPracticeSave", "application/json"
        )
    })

    save_upload.addEventListener("change", () => {
        const file = save_upload.files[0]
        console.log(file)

        let reader = new FileReader()
        reader.onload = function () {
            let data = reader.result;
            localStorage.setItem("runs", data)
        };
        reader.readAsText(file)
    })

    delete_today.addEventListener("click", () => {
        const runs = JSON.parse(localStorage.getItem("runs"));
        let not_todays_runs = []
        for (run of runs) {
            if (!run.date) {
                console.log("No Date")
                not_todays_runs.push(run)
                continue
            }
            const run_date = new Date(run.date)
            if (!is_today(run_date))
                not_todays_runs.push(run)
            else console.log("deleted")

        }

        localStorage.setItem("runs", JSON.stringify(not_todays_runs))
    })

    delete_everything.addEventListener("click", () => {
        window.close()
        localStorage.setItem("runs", "[]")
    })

    report_button.addEventListener("click", character_report)

    character_report()
})
