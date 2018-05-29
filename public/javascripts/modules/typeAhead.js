import axios from 'axios';
import dompurify from 'dompurify';
//const axios = require('axios'); // this is the same as above

const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_ENTER = 13;


function searchResultsHTML(stores) {
    return stores.map(store => {
        return `
            <a href="/store/${store.slug}" class="search__result">
                <strong> ${store.name} </strong> 
            </a>
        `;
    }).join('');
    
}

function typeAhead(search) {
    if (!search) return;

    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');

    searchInput.on('input', function() {
        // if there is no value quit it
        if (!this.value) {
            searchResults.style.display = 'none';
            return; //stop
        }

        //show the search results
        searchResults.style.display = 'block';
        searchResults.innerHTML = '';

        axios
            .get(`/api/search?q=${this.value}`)
            .then(res => {
                if (res.data.length) {
                    searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
                    return;
                }
                //tell them nothing came back
                searchResults.innerHTML = dompurify.sanitize(`<div class="search__result"> No results for ${this.value} found!</div>`);
            })
            .catch(err => {
                console.log(err);
            });
    });

    // handle keyboard inputs
    searchInput.on('keyup', (e) => {
        // if they are not pressing up/down/enter, we dont care
        if (![KEY_UP, KEY_DOWN, KEY_ENTER].includes(e.keyCode)) {
            return; // skip it
        }
        const activeClass = 'search__result--active';
        const current = search.querySelector(`.${activeClass}`);
        const items = search.querySelectorAll('.search__result');
        let next;

        if (e.keyCode === KEY_DOWN && current) {
            next = current.nextElementSibling || items[0];
        } else if (e.keyCode === KEY_DOWN) {
            next = items[0];
        } else if (e.keyCode === KEY_UP && current) {
            next = current.previousElementSibling || items[items.length - 1];
        } else if (e.keyCode === KEY_UP) {
            next = items[items.length - 1];
        } else if (e.keyCode === KEY_ENTER && current.href) {
            window.location = current.href;
            return;
        }

        if (current) {
            current.classList.remove(activeClass);
        }
        next.classList.add(activeClass);
        console.log(next);
    })
}

export default typeAhead;