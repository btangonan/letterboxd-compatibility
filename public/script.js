document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('compatibilityForm');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    const compareBtn = document.getElementById('compareBtn');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username1 = document.getElementById('username1').value.trim();
        const username2 = document.getElementById('username2').value.trim();
        
        if (!username1 || !username2) {
            showError('Please enter both usernames');
            return;
        }
        
        if (username1 === username2) {
            showError('Please enter different usernames');
            return;
        }
        
        hideAllMessages();
        showLoading();
        
        try {
            const response = await fetch('/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username1, username2 })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showResults(data);
            } else {
                showError(data.error || 'An error occurred');
            }
        } catch (err) {
            showError('Failed to connect to server');
        }
    });
    
    function showLoading() {
        loading.classList.remove('hidden');
        compareBtn.disabled = true;
        
        // Update button with loading state
        const buttonText = compareBtn.querySelector('.button-text');
        const loadingSpinner = compareBtn.querySelector('.loading-spinner');
        
        if (buttonText) buttonText.textContent = 'Calculating...';
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
    }
    
    function hideLoading() {
        loading.classList.add('hidden');
        compareBtn.disabled = false;
        
        // Reset button to normal state
        const buttonText = compareBtn.querySelector('.button-text');
        const loadingSpinner = compareBtn.querySelector('.loading-spinner');
        
        if (buttonText) buttonText.textContent = 'Analyze Compatibility';
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
    }
    
    function showResults(data) {
        hideLoading();
        
        const { compatibility, user1, user2 } = data;
        
        // Debug: Log the data to console
        console.log('Compatibility data:', compatibility);
        
        // Update compatibility score
        document.getElementById('compatibilityScore').textContent = `${compatibility.compatibilityScore}%`;
        document.getElementById('scoreSubtitle').textContent = `Based on ${compatibility.totalSharedFilms} shared films`;
        
        // Update score stats
        const starText = compatibility.averageRatingDifference === 1 ? 'star' : 'stars';
        document.getElementById('scoreStats').innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${compatibility.totalSharedFilms}</div>
                <div class="stat-label">Films in common</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${compatibility.sharedFilmsCount}</div>
                <div class="stat-label">Close matches</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${compatibility.averageRatingDifference} ${starText}</div>
                <div class="stat-label">Avg difference</div>
            </div>
        `;
        
        // Helper function to format rating as stars
        function formatRating(rating) {
            const fullStars = Math.floor(rating);
            const halfStar = rating % 1 >= 0.5;
            return '★'.repeat(fullStars) + (halfStar ? '½' : '');
        }
        
        // Display close matches (≤ 0.5 star difference)
        if (compatibility.closeMatches && compatibility.closeMatches.length > 0) {
            const closeMatchesHTML = compatibility.closeMatches.map(film => `
                <a href="${film.url || '#'}" target="_blank" rel="noopener noreferrer" class="film-item-link">
                    <div class="film-item">
                        <div class="film-info">
                            <div class="film-title">${film.title}</div>
                            <div class="film-ratings">
                                <span class="rating-user">
                                    <span class="username">${user1}:</span> ${formatRating(film.user1Rating)}
                                </span>
                                <span class="rating-user">
                                    <span class="username">${user2}:</span> ${formatRating(film.user2Rating)}
                                </span>
                            </div>
                        </div>
                    </div>
                </a>
            `).join('');
            
            document.getElementById('closeMatchesList').innerHTML = closeMatchesHTML;
        } else {
            document.getElementById('closeMatchesList').innerHTML = `
                <div class="film-item">
                    <div class="film-info">
                        <div class="film-title">No close matches found</div>
                        <p>These users don't have similar ratings for shared films (within 0.5 stars).</p>
                    </div>
                </div>
            `;
        }
        
        // Display biggest differences (>= 1.5 star difference)
        if (compatibility.biggestDifferences && compatibility.biggestDifferences.length > 0) {
            const biggestDifferencesHTML = compatibility.biggestDifferences.map(film => `
                <a href="${film.url || '#'}" target="_blank" rel="noopener noreferrer" class="film-item-link">
                    <div class="film-item disagreement">
                        <div class="film-info">
                            <div class="film-title">${film.title}</div>
                            <div class="film-ratings">
                                <span class="rating-user">
                                    <span class="username">${user1}:</span> ${formatRating(film.user1Rating)}
                                </span>
                                <span class="rating-user">
                                    <span class="username">${user2}:</span> ${formatRating(film.user2Rating)}
                                </span>
                            </div>
                        </div>
                    </div>
                </a>
            `).join('');
            
            document.getElementById('disagreementsList').innerHTML = biggestDifferencesHTML;
        } else {
            document.getElementById('disagreementsList').innerHTML = `
                <div class="film-item">
                    <div class="film-info">
                        <div class="film-title">No major disagreements</div>
                        <p>You both have very similar taste in films!</p>
                    </div>
                </div>
            `;
        }
        
        results.classList.remove('hidden');
    }
    
    function showError(message) {
        hideLoading();
        error.textContent = message;
        error.classList.remove('hidden');
    }
    
    function hideAllMessages() {
        loading.classList.add('hidden');
        results.classList.add('hidden');
        error.classList.add('hidden');
    }
});