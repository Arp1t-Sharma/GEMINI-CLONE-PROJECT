const container = document.querySelector(".container");
const chatsContainer = document.querySelector('.chats-container');
const promptForm = document.querySelector('.prompt-form');
const promptInput = promptForm.querySelector('.prompt-input');
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");


//API KEY SETUP
const API_KEY = "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const chatHistory =[];
const userData = { message: "", file: {}};

//Function to create a message elements
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

const scrollToBottom = () => {
    chatsContainer.scrollTop = chatsContainer.scrollHeight;
}

const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = ""; // Clear previous text
    const words = text.split(" ");
    let wordIndex = 0;

    typingInterval = setInterval(() => {
        if ( wordIndex < words.length){
            textElement.textContent += (wordIndex === 0 ? "": " ") + words[wordIndex++];
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
             // Remove loading class when done
        }
    }, 40);
}


// Function to generate a response from the API
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    const userMessage = userData.message;
    controller = new AbortController();

    // Add user message to chat history
    chatHistory.push({
        role: "user",
        parts: [{ text: userMessage}, ...(userData.file.data ? [{ inline_data: (({fileName, isImage, ...rest}) => rest)(userData.file)}]: [])]
    });
    try{
        const response = await fetch(API_URL,{
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ contents: chatHistory}),
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim(); // Remove HTML tags
        typingEffect(responseText, textElement, botMsgDiv);

        chatHistory.push({ role: "model", parts: [{ text: responseText }] });
    } catch (error){
        textElement.style.color = "#d62939"; // Set error text color
        textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
    } finally {
        userData.file = {}; // Clear file data after response
    }
}

//Handle the form submission

const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) return;

    promptInput.value = ""; // Clear the input field
    userData.message = userMessage;
    document.body.classList.add("bot-responding","chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

    // Generate user message HTML and add in the chats container
    const userMsgHTML = `<p class="message-text"></p> ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment"/>` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}`;
    const userMsgDiv = createMsgElement(userMsgHTML,"user-message");

    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom(); // Scroll to the bottom of the chat container

    setTimeout(() => {
         // Generate user message HTML and add in the chats container after 600s
    const botMsgHTML = `<img src="gemini.svg" class="avatar"><p class="message-text">Just a sec..</p>`;
    const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom(); // Scroll to the bottom of the chat container
    generateResponse(botMsgDiv);
    }, 0);
    
}
// Handle file input and preview
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1]; // Get base64 string without prefix
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        userData.file = { fileName: file.name, data: base64String, mine_type: file.type, isImage };
    }
});


//cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

// Stop ongoing response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {};
    controller?.abort(); // Abort the ongoing request
    clearInterval(typingInterval); // Clear the typing effect interval
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");
});

// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = ""; // Clear the chat history
    document.body.classList.remove("bot-responding","chats-active");
   
});

//Handle Suggestion Cl
document.querySelectorAll(".suggestions-item").forEach(item => {
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit")); // Trigger form submission
    });
});
// Show/hide controls for mobile on prompt input focus
document.addEventListener("click",({ target}) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains ("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
})

// Toggle Dark/Light theme
themeToggle.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});



const isLightTheme = localStorage.getItem("themeColor") === "light-theme";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
