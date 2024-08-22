const API_URL = "https://productpricefetcherapi.onrender.com/";

const makeProductList = (productsArray) => {
    const productsContainer = document.getElementById('productList');

    // Clear previous content
    productsContainer.innerHTML = '';
    // console.log(productsArray);
    // Create and append product elements
    productsArray.forEach((product, index) => {
      const productDiv = document.createElement('div');
      productDiv.classList.add('product');
      
      productDiv.innerHTML = `
        <button class="deleteButton" data-index="${index}"></button>
        <p class="productName">${product.title}</p>
        <div class="price">
          <p>${product.offerPrice}</p>
          <p>${product.originalPrice}</p>
        </div>
      `;
      
      productsContainer.appendChild(productDiv);
    });

    document.querySelectorAll('.deleteButton').forEach(button => {
        button.addEventListener('click', (event) => {
            const index = event.target.getAttribute('data-index');
            deleteProduct(index);
        });
    });
}

// Function to delete a product from the array in Chrome storage
const deleteProduct = (index) => {
    chrome.storage.local.get('productsArray', (result) => {
        let productsArray = result.productsArray || [];
        
        // Remove the product at the given index
        productsArray.splice(index, 1);

        // Update Chrome storage with the new array
        chrome.storage.local.set({ 'productsArray': productsArray }, () => {
            console.log('Product deleted and array updated.');
            // Re-render the updated list
            makeProductList(productsArray);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Fetch data from Chrome storage and display it
  chrome.storage.local.get('productsArray', (result) => {
    const productsArray = result.productsArray || [];
    makeProductList(productsArray);
  });


    // Add event listener for the refresh button
    document.getElementById('refreshButton').addEventListener('click', async () => {
        try {
            // Fetch data from Chrome storage
            chrome.storage.local.get('productsArray', async (result) => {
                const paramsArray = result.productsArray || [];
                
                if (paramsArray.length > 0) {
                    const offers = [];
                    
                    // Make request to backend for each parameter
                    await Promise.all(paramsArray.map(async (param) => {
                        try {
                            const response = await fetch(`${API_URL}fetchData?queryString=${param.asin}`);
                            
                            if (!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            
                            const data = await response.json();
                            offers.push(data);
                        } catch (error) {
                            console.error('Error fetching data for ASIN:', param.asin, error);
                            document.getElementById('result').textContent = `Error fetching data for ASIN: ${param.asin}`;
                        }
                    }));
                    
                    // Update productsArray in Chrome storage
                    chrome.storage.local.set({ 'productsArray': offers }, () => {
                        makeProductList(offers);
                        document.getElementById('result').textContent = 'Product list updated.';
                    });
                } else {
                    document.getElementById('result').textContent = 'No parameters found in storage.';
                }
            });
        } catch (error) {
            console.error('Error during refresh:', error);
            document.getElementById('result').textContent = `Error: ${error.message}`;
        }
    });
    

    document.getElementById('addButton').addEventListener('click', () => {
        const newParam = document.getElementById('paramInput').value.trim();

        if (newParam) {
            chrome.storage.local.get('productsArray', async (result) => {
                let productsArray = result.productsArray || [];

                // Check if the product is already in the array
                const productExists = productsArray.some(product => product.asin === newParam);

                if (productExists) {
                    document.getElementById('result').textContent = 'Product already exists.';
                } else if (productsArray.length >= 5) {
                    document.getElementById('result').textContent = 'Maximum product limit reached. Cannot add more.';
                } else {
                    try {
                        const response = await fetch(`${API_URL}fetchData?queryString=${newParam}`);
                        
                        // const newProduct = {
                        //     title: apiResponse.title, 
                        //     price: apiResponse.price, 
                        //     originalPrice: apiResponse.originalPrice
                        // };

                        const data = await response.json();
                        
                        productsArray.push(data);
                        chrome.storage.local.set({ 'productsArray': productsArray }, () => {
                            console.log('Product added and saved.');
                            document.getElementById('paramInput').value = '';
                            document.getElementById('result').textContent = 'Product added.';
                            makeProductList(productsArray);
                        });
                    } catch (error) {
                        document.getElementById('result').textContent = 'Error fetching product data from API.';
                        console.error('Error fetching data from external API:', error);
                    }
                }
            });
        } else {
            document.getElementById('result').textContent = 'Please enter a parameter.';
        }
    });


});
