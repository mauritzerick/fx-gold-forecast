/**
 * Convert data to CSV format
 * @param rows - Array of data objects
 * @param headers - Column headers
 * @returns CSV string
 */
export function toCsv(rows: any[], headers: string[]): string {
  if (rows.length === 0) return '';

  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 * @param csvContent - CSV string content
 * @param filename - File name
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
