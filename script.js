document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const modalClose = document.getElementById('modal-close');

    let dataRows = [];
    let currentRowIndex = 0;
    let currentTileIndex = 0;
    // True when the modal is open
    let modalIsOpen = false;

    // Event listener when the modal is closed 
    modalClose.addEventListener('click', closeModal);

    document.addEventListener('keydown', function (event) {
        if (modalIsOpen && event.key == 'Backspace') {
            event.stopPropagation();
            closeModal();
            return;
        }

        if (modalIsOpen) return;
        switch (event.key) {
            case 'ArrowUp':
                moveUp();
                break;
            case 'ArrowDown':
                moveDown();
                break;
            case 'ArrowRight':
                moveRight();
                break;
            case 'ArrowLeft':
                moveLeft();
                break;
            case 'Enter':
                handleTileSelection();
                break;
            default:
                break;
        }
    });

    // Fetch data and initialize
    fetchData();

    let refIdList = []

    function fetchData() {
        // GET request to the home.json API to retrive data for home page
        fetch('https://cd-static.bamgrid.com/dp-117731241344/home.json')
            .then(response => response.json()) //parses response as JSON
            .then(data => {
                // gets containers array which has the different content categories
                const containers = data.data.StandardCollection.containers;
                renderRows(containers);
                initializeFocus();
            })
            .catch(error => console.error('Error fetching data:', error));
    }

    function fetchRefData(refId, mutateData) {
        // GET request to the ref.json API to retrive data for reference data
        return fetch(`https://cd-static.bamgrid.com/dp-117731241344/sets/${refId}.json`)
            .then(response => response.json()) //parses response as JSON
            .then(data => {
                const containers = data.data;
                mutateData(containers);
                return containers;
            })
            .catch(error => console.error('Error fetching ref data:', error));
    }


    function renderRows(containers) {
        // Iterating through each container to get corresponding rows and tiles
        containers.forEach((container, rowIndex) => {
            // Create Row Parent Element
            const rowContainer = document.createElement('div');
            rowContainer.classList.add('row-container');

            // Create Row Title
            const rowTitle = document.createElement('div');
            rowTitle.classList.add('row-title');
            rowTitle.textContent = container.set.text.title.full.set.default.content || 'Untitled';
            rowContainer.appendChild(rowTitle);

            const tilesContainer = document.createElement('div');
            tilesContainer.classList.add('row');


            if (!container.set.items) {
                // If there are no items, create an observer to check when the item comes into view.
                // Once in view, make a request to get the row data base don the refId.
                let hasBeenVisibleBefore = false;
                const observer = new IntersectionObserver(entries => {
                    entries.forEach(entry => {
                        // If the item is not visible, do nothing.
                        if (!entry.isIntersecting) return;

                        // Don't make another call for data, after making the first call.
                        if (hasBeenVisibleBefore) return;

                        // Fetch Reference Data
                        fetchRefData(container.set.refId, (refData) => {
                            if (!refData) return;
                            // Fallback to CuratedSet since BecauseOfYouSet doesn't exist
                            let setOfData = refData[container.set.refType] || refData.CuratedSet;
                            const tiles = getTiles(setOfData, rowIndex);
                            tiles.forEach(tile => tilesContainer.appendChild(tile));
                            dataRows.push({ rowContainer, tilesContainer, tiles });
                        });
                        
                        // Prevent extra call from being made once visible again.
                        hasBeenVisibleBefore = true;
                    });
                }, {});
                observer.observe(rowTitle);

                rowContainer.appendChild(tilesContainer);
                app.appendChild(rowContainer);
            } else {
                // Create the tiles directly
                const tiles = getTiles(container.set, rowIndex);
                tiles.forEach(tile => tilesContainer.appendChild(tile));

                rowContainer.appendChild(tilesContainer);
                app.appendChild(rowContainer);
                dataRows.push({ rowContainer, tilesContainer, tiles });
            }

        });
    }

    function getTitle(item) {
        let parentTitle = item.text?.title?.full;
        return (parentTitle?.series || parentTitle?.program || parentTitle?.collection).default?.content || 'Untitled';
    }

    function getTiles(containerSet, rowIndex) {
        const tiles = containerSet.items.map((item, tileIndex) => {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.dataset.rowIndex = rowIndex;
            tile.dataset.tileIndex = tileIndex;

            const refId = item.encodedSeriesId || 'Unknown-Ref-ID';
            tile.dataset.refId = refId;

            const fullTitle = getTitle(item);
            tile.dataset.fullTitle = fullTitle;

            // Adding more data for modal
            const description = item.description || 'No description available.';
            tile.dataset.description = description;

            const releaseDate = item.releases?.[0]?.releaseDate || 'Unknown release date';
            tile.dataset.releaseDate = releaseDate;

            const rating = item.ratings?.[0]?.value || 'No rating';
            tile.dataset.rating = rating;

            const contentType = item.type || 'Unknown type';
            tile.dataset.contentType = contentType;

            const imageUrl = getImageUrl(item);
            if (imageUrl) {
                const imgWrapper = document.createElement('div');
                imgWrapper.classList.add('tile-image-wrapper');

                const img = document.createElement('img');
                img.src = imageUrl;

                imgWrapper.appendChild(img);
                tile.appendChild(imgWrapper);
            } else {
                tile.style.backgroundColor = '#555';
            }

            const tileTitle = document.createElement('div');
            tileTitle.textContent = fullTitle;
            tileTitle.classList.add("tile-title");
            tile.appendChild(tileTitle);

            return tile;
        });
        return tiles;
    }

    function getImageUrl(item) {
        const aspectRatio = "1.78"; // Define the aspect ratio we're interested in

        // Define possible content types to handle different scenarios
        const contentTypes = ["program", "series", "default"];

        // Check if the image and the desired aspect ratio exist
        if (item?.image?.tile?.[aspectRatio]) {
            // Iterate through the possible content types
            for (const type of contentTypes) {
                try {
                    if (item.image.tile[aspectRatio][type]?.default?.url) {
                        return item.image.tile[aspectRatio][type].default.url;
                    }
                } catch {
                    // Continue to next type if an error occurs
                }
            }
        }

        // Return null if no image URL is found
        return null;
    }

    function initializeFocus() {
        if (dataRows.length > 0) {
            currentRowIndex = 0;
            currentTileIndex = 0;
            updateFocus();
        }
    }

    function moveRight() {
        const { tiles } = dataRows[currentRowIndex];
        if (currentTileIndex < tiles.length - 1) {
            currentTileIndex++;
            updateFocus();
        }
    }

    function moveLeft() {
        if (currentTileIndex > 0) {
            currentTileIndex--;
            updateFocus();
        }
    }

    function moveDown() {
        if (currentRowIndex < dataRows.length - 1) {
            currentRowIndex++;
            currentTileIndex = 0;
            updateFocus();
        }
    }

    function moveUp() {
        if (currentRowIndex > 0) {
            currentRowIndex--;
            currentTileIndex = 0;
            updateFocus();
        }
    }

    function updateFocus() {
        // Remove focus from all tiles
        document.querySelectorAll('.tile.focused').forEach(tile => tile.classList.remove('focused'));

        const { rowContainer, tilesContainer, tiles } = dataRows[currentRowIndex];

        // Ensure currentTileIndex is within bounds
        if (currentTileIndex >= tiles.length) {
            currentTileIndex = tiles.length - 1;
        }

        const currentTile = tiles[currentTileIndex];
        currentTile.classList.add('focused');

        // Scroll horizontally within the row
        const tileOffsetLeft = currentTile.offsetLeft;
        const tileWidth = currentTile.offsetWidth;
        const containerWidth = tilesContainer.offsetWidth;
        const scrollPosition = tileOffsetLeft - (containerWidth / 2) + (tileWidth / 2);

        tilesContainer.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });

        // Scroll vertically to bring the row into view
        const rowOffsetTop = rowContainer.offsetTop;
        const rowHeight = rowContainer.offsetHeight;
        const appHeight = app.offsetHeight;
        const scrollTopPosition = rowOffsetTop - (appHeight / 2) + (rowHeight / 2);

        app.scrollTo({
            top: scrollTopPosition,
            behavior: 'smooth'
        });
    }

    function handleTileSelection() {
        const { tiles } = dataRows[currentRowIndex];
        const currentTile = tiles[currentTileIndex];
        const refId = currentTile.dataset.refId;
        const fullTitle = currentTile.dataset.fullTitle;
        const description = currentTile.dataset.description;
        const releaseDate = currentTile.dataset.releaseDate;
        const rating = currentTile.dataset.rating;
        const contentType = currentTile.dataset.contentType;

        // Simulate fetching content details
        const contentDetails = {
            title: fullTitle,
            refId: refId,
            description: description,
            releaseDate: releaseDate,
            rating: rating,
            content: contentType,
            type: contentType
        };

        showModal(contentDetails);
    }

    function showModal(details) {
        modalTitle.textContent = details.title;

        let dateString = (new Date(details.releaseDate)).toLocaleDateString("en-US", {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        let date = dateString === "Invalid Date" ? 'N/A' : dateString;

        // Use template literals to format the modal description
        modalDescription.textContent = `
            Release Date: ${date} \n
            Rating: ${details.rating} \n
            Content Type: ${details.type} \n
            Reference ID: ${details.refId} \n
        `;

        modal.classList.remove('hidden');
        modal.classList.add('show');
        modalIsOpen = true;
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        modalIsOpen = false;
        // Return focus to the previously focused tile
        updateFocus();
    }
});
