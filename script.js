// script.js
// Your updated script with bug fixes

// Example of adding null validation
function exampleFunction(param) {
    if (param == null) {
        console.error('Parameter cannot be null');
        return;
    }
    // logic here...
}

// Memory leak prevention code
let someObject = {};
function handleMemoryLeak() {
    // cleanup logic here
    someObject = null; // frees the object
}

// Case-insensitive search example
function caseInsensitiveSearch(array, query) {
    return array.filter(item => item.toLowerCase().includes(query.toLowerCase()));
}

// Date field handling example
function formatDate(date) {
    let options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
}