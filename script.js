/**
 * Job Tracker Application
 * A comprehensive job application tracking system with localStorage persistence
 */

// Global variables
let jobs = [];
let filteredJobs = [];
let currentSort = { column: null, direction: 'asc' };
let editingJobId = null;

// DOM elements
const modal = document.getElementById('jobModal');
const jobForm = document.getElementById('jobForm');
const jobsTableBody = document.getElementById('jobsTableBody');
const searchInput = document.getElementById('searchInput');
const noJobsMessage = document.getElementById('noJobsMessage');
const addJobBtn = document.getElementById('addJobBtn');
const exportBtn = document.getElementById('exportBtn');
const modalTitle = document.getElementById('modalTitle');

/**
 * Initialize the application
 */
function init() {
    loadJobs();
    setupEventListeners();
    renderTable();
    handleURLParameters();
    
    // Set today's date as default for date applied
    document.getElementById('dateApplied').valueAsDate = new Date();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Modal controls
    addJobBtn.addEventListener('click', openModal);
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Form submission
    jobForm.addEventListener('submit', handleFormSubmit);
    
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    
    // Export functionality
    exportBtn.addEventListener('click', exportToCSV);
    
    // Table sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
        if (e.key === 'Enter' && e.ctrlKey) {
            openModal();
        }
    });
}

/**
 * Load jobs from localStorage
 */
function loadJobs() {
    const savedJobs = localStorage.getItem('jobTracker');
    if (savedJobs) {
        jobs = JSON.parse(savedJobs);
        // Ensure each job has an ID (for backward compatibility)
        jobs.forEach((job, index) => {
            if (!job.id) {
                job.id = `job_${Date.now()}_${index}`;
            }
        });
        saveJobs();
    }
    filteredJobs = [...jobs];
}

/**
 * Save jobs to localStorage
 */
function saveJobs() {
    localStorage.setItem('jobTracker', JSON.stringify(jobs));
}

/**
 * Handle URL parameters for bookmarklet integration
 */
function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const title = urlParams.get('title');
    const company = urlParams.get('company');
    const url = urlParams.get('url');
    
    if (title || company || url) {
        // Auto-fill form with URL parameters
        if (title) document.getElementById('jobTitle').value = decodeURIComponent(title);
        if (company) document.getElementById('company').value = decodeURIComponent(company);
        if (url) document.getElementById('jobUrl').value = decodeURIComponent(url);
        
        // Auto-detect platform from URL
        if (url) {
            const urlObj = new URL(decodeURIComponent(url));
            const hostname = urlObj.hostname.toLowerCase();
            
            if (hostname.includes('linkedin.com')) {
                document.getElementById('platform').value = 'LinkedIn';
            } else if (hostname.includes('indeed.com')) {
                document.getElementById('platform').value = 'Indeed';
            } else if (hostname.includes('jobstreet.com')) {
                document.getElementById('platform').value = 'JobStreet';
            } else if (hostname.includes('glassdoor.com')) {
                document.getElementById('platform').value = 'Glassdoor';
            }
        }
        
        // Open modal automatically
        openModal();
        
        // Clear URL parameters to avoid re-opening on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Open the job modal
 */
function openModal() {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Reset form
    jobForm.reset();
    document.getElementById('dateApplied').valueAsDate = new Date();
    
    // Update modal title
    modalTitle.textContent = 'Add New Job';
    editingJobId = null;
    
    // Focus on first input
    setTimeout(() => document.getElementById('jobTitle').focus(), 100);
}

/**
 * Close the job modal
 */
function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset form and editing state
    jobForm.reset();
    editingJobId = null;
}

/**
 * Handle form submission
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(jobForm);
    const jobData = {
        id: editingJobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        jobTitle: formData.get('jobTitle').trim(),
        company: formData.get('company').trim(),
        platform: formData.get('platform') || '',
        expectedSalary: formData.get('expectedSalary') ? parseInt(formData.get('expectedSalary')) : null,
        status: formData.get('status'),
        contactPerson: formData.get('contactPerson').trim() || '',
        dateApplied: formData.get('dateApplied'),
        jobUrl: formData.get('jobUrl').trim() || ''
    };
    
    // Validate required fields
    if (!jobData.jobTitle || !jobData.company || !jobData.status || !jobData.dateApplied) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    // Add or update job
    if (editingJobId) {
        const index = jobs.findIndex(job => job.id === editingJobId);
        if (index !== -1) {
            jobs[index] = jobData;
            showMessage('Job updated successfully!', 'success');
        }
    } else {
        jobs.unshift(jobData); // Add to beginning for newest first
        showMessage('Job added successfully!', 'success');
    }
    
    saveJobs();
    applySearch(); // Re-apply search filter
    renderTable();
    closeModal();
}

/**
 * Edit a job
 */
function editJob(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    // Populate form with job data
    document.getElementById('jobTitle').value = job.jobTitle;
    document.getElementById('company').value = job.company;
    document.getElementById('platform').value = job.platform || '';
    document.getElementById('expectedSalary').value = job.expectedSalary || '';
    document.getElementById('status').value = job.status;
    document.getElementById('contactPerson').value = job.contactPerson || '';
    document.getElementById('dateApplied').value = job.dateApplied;
    document.getElementById('jobUrl').value = job.jobUrl || '';
    
    // Update modal title and editing state
    modalTitle.textContent = 'Edit Job';
    editingJobId = jobId;
    
    // Open modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Focus on first input
    setTimeout(() => document.getElementById('jobTitle').focus(), 100);
}

/**
 * Delete a job
 */
function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job?')) {
        return;
    }
    
    const index = jobs.findIndex(job => job.id === jobId);
    if (index !== -1) {
        jobs.splice(index, 1);
        saveJobs();
        applySearch(); // Re-apply search filter
        renderTable();
        showMessage('Job deleted successfully!', 'success');
    }
}

/**
 * Update job status
 */
function updateJobStatus(jobId, newStatus) {
    const job = jobs.find(j => j.id === jobId);
    if (job && job.status !== newStatus) {
        job.status = newStatus;
        saveJobs();
        applySearch(); // Re-apply search filter
        renderTable();
        showMessage('Status updated successfully!', 'success');
    }
}

/**
 * Handle search functionality
 */
function handleSearch() {
    applySearch();
    renderTable();
}

/**
 * Apply search filter
 */
function applySearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredJobs = [...jobs];
    } else {
        filteredJobs = jobs.filter(job => 
            job.jobTitle.toLowerCase().includes(searchTerm) ||
            job.company.toLowerCase().includes(searchTerm)
        );
    }
}

/**
 * Handle table sorting
 */
function handleSort(column) {
    // Determine sort direction
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    // Sort the filtered jobs
    filteredJobs.sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        
        // Handle different data types
        if (column === 'expectedSalary') {
            aValue = aValue || 0;
            bValue = bValue || 0;
        } else if (column === 'dateApplied') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        } else {
            aValue = (aValue || '').toString().toLowerCase();
            bValue = (bValue || '').toString().toLowerCase();
        }
        
        let result = 0;
        if (aValue < bValue) result = -1;
        else if (aValue > bValue) result = 1;
        
        return currentSort.direction === 'asc' ? result : -result;
    });
    
    // Update sort indicators
    updateSortIndicators();
    
    // Re-render table
    renderTable();
}

/**
 * Update sort indicators in table headers
 */
function updateSortIndicators() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentSort.column) {
            th.classList.add(`sorted-${currentSort.direction}`);
        }
    });
}

/**
 * Render the jobs table
 */
function renderTable() {
    const tbody = jobsTableBody;
    tbody.innerHTML = '';
    
    if (filteredJobs.length === 0) {
        noJobsMessage.style.display = 'block';
        return;
    }
    
    noJobsMessage.style.display = 'none';
    
    filteredJobs.forEach(job => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(job.jobTitle)}</td>
            <td>${escapeHtml(job.company)}</td>
            <td>${escapeHtml(job.platform || '')}</td>
            <td>${job.expectedSalary ? formatSalary(job.expectedSalary) : '-'}</td>
            <td>
                <span class="status-badge status-${job.status.toLowerCase()} editable-status" 
                      onclick="showStatusDropdown('${job.id}', '${job.status}')">
                    ${job.status}
                </span>
            </td>
            <td>${escapeHtml(job.contactPerson || '')}</td>
            <td>${formatDate(job.dateApplied)}</td>
            <td>
                ${job.jobUrl ? `<a href="${escapeHtml(job.jobUrl)}" target="_blank" class="job-url" title="${escapeHtml(job.jobUrl)}">View Job</a>` : '-'}
            </td>
            <td>
                <button class="action-btn edit-btn" onclick="editJob('${job.id}')" title="Edit Job">
                    ✏️
                </button>
                <button class="action-btn delete-btn" onclick="deleteJob('${job.id}')" title="Delete Job">
                    🗑️
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Show status dropdown for inline editing
 */
function showStatusDropdown(jobId, currentStatus) {
    const statuses = ['Applied', 'Interview', 'Offer', 'Rejected'];
    const dropdown = document.createElement('select');
    
    dropdown.innerHTML = statuses.map(status => 
        `<option value="${status}" ${status === currentStatus ? 'selected' : ''}>${status}</option>`
    ).join('');
    
    dropdown.addEventListener('change', (e) => {
        updateJobStatus(jobId, e.target.value);
    });
    
    dropdown.addEventListener('blur', () => {
        dropdown.remove();
    });
    
    // Replace the status badge with dropdown
    const statusElement = document.querySelector(`[onclick="showStatusDropdown('${jobId}', '${currentStatus}')"]`);
    statusElement.parentNode.replaceChild(dropdown, statusElement);
    dropdown.focus();
}

/**
 * Export jobs to CSV
 */
function exportToCSV() {
    if (jobs.length === 0) {
        showMessage('No jobs to export.', 'error');
        return;
    }
    
    const headers = ['Job Title', 'Company', 'Platform', 'Expected Salary', 'Status', 'Contact Person', 'Date Applied', 'Job URL'];
    const csvContent = [
        headers.join(','),
        ...jobs.map(job => [
            `"${job.jobTitle.replace(/"/g, '""')}"`,
            `"${job.company.replace(/"/g, '""')}"`,
            `"${(job.platform || '').replace(/"/g, '""')}"`,
            job.expectedSalary || '',
            job.status,
            `"${(job.contactPerson || '').replace(/"/g, '""')}"`,
            job.dateApplied,
            `"${(job.jobUrl || '').replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `job-tracker-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Jobs exported successfully!', 'success');
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format salary for display
 */
function formatSalary(salary) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(salary);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Show temporary message to user
 */
function showMessage(message, type = 'success') {
    // Remove existing messages
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    container.insertBefore(messageEl, container.firstChild);
    
    // Show message
    messageEl.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.remove();
        }
    }, 3000);
}

/**
 * Generate bookmarklet code for easy installation
 */
function generateBookmarklet() {
    const bookmarkletCode = `
        javascript:(function(){
            var title = document.title.replace(/[|\\s]*-\\s*(LinkedIn|Indeed|JobStreet|Glassdoor).*/,'').trim();
            var company = '';
            var url = window.location.href;
            
            // Extract company name based on platform
            if (window.location.hostname.includes('linkedin.com')) {
                var companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name a');
                if (companyEl) company = companyEl.textContent.trim();
            } else if (window.location.hostname.includes('indeed.com')) {
                var companyEl = document.querySelector('[data-testid="company-name"] a, .companyName a, .companyName');
                if (companyEl) company = companyEl.textContent.trim();
            } else if (window.location.hostname.includes('jobstreet.com')) {
                var companyEl = document.querySelector('[data-automation="job-detail-header-company-name"] a, .job-detail-header-company-name a');
                if (companyEl) company = companyEl.textContent.trim();
            } else if (window.location.hostname.includes('glassdoor.com')) {
                var companyEl = document.querySelector('.job-details-header__company-name a, .job-details-header__company-name');
                if (companyEl) company = companyEl.textContent.trim();
            } else {
                var meta = document.querySelector('meta[property="og:site_name"]');
                if (meta) company = meta.content;
            }
            
            // Build URL with parameters
            var params = new URLSearchParams();
            params.set('title', encodeURIComponent(title));
            params.set('company', encodeURIComponent(company));
            params.set('url', encodeURIComponent(url));
            
            // Open Job Tracker in new tab
            window.open('index.html?' + params.toString(), '_blank');
        })();
    `;
    
    return bookmarkletCode.trim();
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export functions for global access (needed for onclick handlers)
window.editJob = editJob;
window.deleteJob = deleteJob;
window.updateJobStatus = updateJobStatus;
window.showStatusDropdown = showStatusDropdown;