const indexedDB = 
window.indexedDB ||
window.mozIndexedDB ||
window.webkitIndexedDB ||
window.msIndexedDB ||
window.shimIndexedDB;

let request = indexedDB.open('screenshotDB', 1);
let db = null;
const modal = document.getElementById('myModal');
const modalImage = document.getElementById('modalImage');
const defaultURL = "https://raw.githubusercontent.com/royg24/NewBlockOrigin/master/dist/build/uBlock0.chromium/assets/Images/unavailable.png";

    request.onerror = (event) =>{
        alert("an error was occured in indexedDB");
        console.error("an error was occured in indexedDB");
        console.error(event);
    };

    request.onupgradeneeded = (event) =>{
        db = event.target.result;
        if(!db.objectStoreNames.contains("screenshots")){
            const store = db.createObjectStore("screenshots", {keyPath: "name"});
        }
        console.log('upgrade', db);
    };

    request.onsuccess = (event) =>{
        db = request.result;
        console.log('success', db);
    };

    export async function addRecordToDB(name, DataURL, PageURL) {
        if (!db) {
            console.error("Database not initialized.");
            return;
        }
        name = name.trim('\n');
        const blob = URLtoBlob(DataURL);
        const sc = { name: name, blob: blob, url: PageURL };
        const tx = db.transaction("screenshots", "readwrite");
        const store = tx.objectStore("screenshots");
    
        return new Promise((resolve, reject) => {
            const req = store.put(sc);
    
            req.onsuccess = () => {
                console.log("Screenshot saved");
            };
    
            req.onerror = (event) => {
                console.error("Request error: ", event.target.error);
                reject("Request error: " + event.target.error);
            };
    
            tx.oncomplete = () => {
                console.log("Transaction completed successfully");
                resolve("Record added successfully");
            };
    
            tx.onerror = (event) => {
                console.error("Transaction failed", event.target.error);
                reject("Transaction failed: " + event.target.error);
            };
    
            tx.onabort = (event) => {
                console.error("Transaction aborted", event.target.error);
                reject("Transaction aborted: " + event.target.error);
            };
        });
    }

    export async function deleteRecordFromDB(name) {
        if (!db) {
            console.error("Database not initialized.");
            return;
        }
    
        const tx = db.transaction("screenshots", "readwrite");
        const store = tx.objectStore("screenshots");
    
        return new Promise((resolve, reject) => {
            // First, check if the record exists
            const getReq = store.get(name);
        
            getReq.onsuccess = () => {
                if (getReq.result === undefined) {
                    // The record was not found
                    console.log("Record not found.");
                    resolve("Record not found.");
                } else {
                    // Proceed to delete the record
                    const deleteReq = store.delete(name);
                    deleteReq.onsuccess = () => {
                        // Record deleted successfully
                        console.log("Record deleted successfully.");
                        resolve("Record deleted successfully.");
                    };
        
                    deleteReq.onerror = (event) => {
                        console.error("Failed to delete record:", event.target.error);
                        reject("Failed to delete record: " + event.target.error);
                    };
                }
            };
        
            getReq.onerror = (event) => {
                console.error("Failed to check for record:", event.target.error);
                reject("Failed to check for record: " + event.target.error);
            };
        });
     
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });


    export async function showScreenshotFromDB(name) {
        name = name.trim('\n');
        const tx = db.transaction("screenshots", "readonly");
        const store = tx.objectStore("screenshots");
    
        return new Promise((resolve, reject) => {
            const req = store.get(name);
    
            req.onsuccess = async () => {
                console.log("Screenshot pulled");
                const urlbutton = document.getElementById("goToPage");
                let imageURL;
                if(req.result != undefined)
                {
                    imageURL = await blobToURL(req.result.blob);
                    urlbutton.disabled = false;
                    const pageURL = req.result.url;
                    urlbutton.onclick = () => {
                        window.open(pageURL, '_blank');
                    };
                } 
                else
                {
                    imageURL = defaultURL;
                    urlbutton.disabled = true;
                }
                modalImage.src = imageURL;
                modal.style.display = "block";
            };
    
            req.onerror = (event) => {
                console.error("Request error: ", event.target.error);
                reject("Request error: " + event.target.error);
            };
    
            tx.oncomplete = () => {
                console.log("Transaction completed successfully");
                resolve("Record added successfully");
            };
    
            tx.onerror = (event) => {
                console.error("Transaction failed", event.target.error);
                reject("Transaction failed: " + event.target.error);
            };
    
            tx.onabort = (event) => {
                console.error("Transaction aborted", event.target.error);
                reject("Transaction aborted: " + event.target.error);
            };
        });
    }
    
    
    export async function clearDB() {
        const tx = db.transaction("screenshots", "readwrite");
        const store = tx.objectStore("screenshots");
        const request = store.clear();
    
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log("Object store cleared");
            };
    
            request.onerror = (event) => {
                console.error("Error clearing object store", event.target.error);
                reject("Error clearing object store: " + event.target.error);
            };
    
            tx.oncomplete = () => {
                console.log("Transaction completed successfully");
                alert("Transaction completed successfully");
                resolve("Database cleared successfully");
            };
    
            tx.onerror = (event) => {
                console.error("Transaction failed", event.target.error);
                reject("Transaction failed: " + event.target.error);
            };
    
            tx.onabort = (event) => {
                console.error("Transaction aborted", event.target.error);
                reject("Transaction aborted: " + event.target.error);
            };
        });
    }
    


    function URLtoBlob(dataUrl){
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        return blob;
    }

    function blobToURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
    
            reader.onloadend = function() {
                resolve(reader.result); // Resolve the promise with the data URL
            };
    
            reader.onerror = function(event) {
                reject(new Error('Error reading Blob: ' + event.target.errorCode)); // Reject the promise if there's an error
            };
    
            reader.readAsDataURL(blob);
        });
    }