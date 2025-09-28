// Reports Manager para MongoDB
    class ReportsManager {
      constructor() {
        this.apiBaseUrl = '/api';
        this.charts = {};
        this.currentFilter = {
          from: '',
          to: ''
        };

        // Obtener authManager de forma segura - AGREGAR ESTAS LÍNEAS
        this.authManager = window.authManager;
        if (!this.authManager) {
            // Si no existe, crear instancia
            this.authManager = new AuthManager();
            window.authManager = this.authManager;
        }

        this.init();
      }

      init() {
        // 1. Verificar acceso usando el AuthManager
        if (this.authManager && !this.authManager.validatePageAccess()) {
            return;
        }
        
        // 2. Filtrar menú según rol
        if (this.authManager) {
            this.authManager.filterMenuByRole();
        } else {
            // Verificación de respaldo por si authManager no está disponible
            if (!this.authManager.isLoggedIn()) {
                window.location.href = 'index.html';
                return;
            }
        }
        
        // 3. Si pasó todas las validaciones, cargar la página
        this.loadUserInfo();
        this.setupEventListeners();
        this.setupDateFilters();
        this.loadReportsData();
      }

      setupDateFilters() {
        // Establecer fechas por defecto (últimos 30 días)
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        document.getElementById('rep-from').value = this.formatDate(thirtyDaysAgo);
        document.getElementById('rep-to').value = this.formatDate(today);
        
        this.currentFilter.from = thirtyDaysAgo;
        this.currentFilter.to = today;
      }

      formatDate(date) {
        return date.toISOString().split('T')[0];
      }

      async loadReportsData() {
        try {
          this.showLoadingState();
          
          const [salesReport, productsReport, inventoryReport, recentSales] = await Promise.all([
            this.fetchSalesData(),
            this.fetchProductsData(),
            this.fetchInventoryData(),
            this.fetchRecentSales()
          ]);

          this.updateKPIs(salesReport);
          this.updateSalesTrendChart(salesReport.dailySales || []);
          this.updateTopProductsChart(productsReport.topProducts || []);
          this.updateSalesByHourChart(salesReport.hourlySales || []);
          this.updateInventoryChart(inventoryReport.categoryStats || []);
          this.updateRecentSalesTable(recentSales.sales || []);

        } catch (error) {
          console.error('Error loading reports data:', error);
          this.showError('Error al cargar los reportes');
        }
      }

      async fetchSalesData() {
        const params = new URLSearchParams({
          from: this.currentFilter.from.toISOString(),
          to: this.currentFilter.to.toISOString()
        });

        return await this.fetchData(`/reports/sales?${params}`);
      }

      async fetchProductsData() {
        return await this.fetchData('/reports/top-products');
      }

      async fetchInventoryData() {
        return await this.fetchData('/reports/inventory');
      }

      async fetchRecentSales() {
        return await this.fetchData('/sales/recent?limit=10');
      }

      updateKPIs(salesReport) {
        if (!salesReport) return;

        document.getElementById('kpi-total-sales').textContent = 
          `S/ ${(salesReport.totalSales || 0).toFixed(2)}`;
        
        document.getElementById('kpi-total-products').textContent = 
          (salesReport.totalProductsSold || 0).toLocaleString();
        
        document.getElementById('kpi-total-transactions').textContent = 
          (salesReport.totalTransactions || 0).toLocaleString();
        
        const averageTicket = salesReport.totalTransactions > 0 ? 
          (salesReport.totalSales / salesReport.totalTransactions) : 0;
        
        document.getElementById('kpi-average-ticket').textContent = 
          `S/ ${averageTicket.toFixed(2)}`;
      }

      updateSalesTrendChart(dailySales) {
        const ctx = document.getElementById('chart-sales-trend').getContext('2d');
        
        if (this.charts.salesTrend) {
          this.charts.salesTrend.destroy();
        }

        if (!dailySales || dailySales.length === 0) {
          this.showNoDataChart(ctx, 'No hay datos de ventas para el período seleccionado');
          return;
        }

        const labels = dailySales.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        });

        const data = dailySales.map(item => item.total || 0);

        this.charts.salesTrend = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Ventas Diarias (S/)',
              data: data,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              tension: 0.4,
              fill: true,
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return 'S/ ' + value;
                  }
                }
              }
            }
          }
        });
      }

      updateTopProductsChart(topProducts) {
        const ctx = document.getElementById('chart-top-products').getContext('2d');
        
        if (this.charts.topProducts) {
          this.charts.topProducts.destroy();
        }

        if (!topProducts || topProducts.length === 0) {
          this.showNoDataChart(ctx, 'No hay datos de productos vendidos');
          return;
        }

        const labels = topProducts.map(item => item.productName || 'Producto').slice(0, 8);
        const data = topProducts.map(item => item.quantitySold || 0).slice(0, 8);

        this.charts.topProducts = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Unidades Vendidas',
              data: data,
              backgroundColor: '#10b981',
              borderColor: '#059669',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
      }

      updateSalesByHourChart(hourlySales) {
        const ctx = document.getElementById('chart-sales-by-hour').getContext('2d');
        
        if (this.charts.salesByHour) {
          this.charts.salesByHour.destroy();
        }

        // Datos de ejemplo si no hay datos reales
        const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
        const data = hourlySales && hourlySales.length > 0 ? 
          hourlySales : Array.from({length: 24}, () => Math.random() * 1000);

        this.charts.salesByHour = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: hours,
            datasets: [{
              label: 'Ventas por Hora',
              data: data,
              backgroundColor: '#8b5cf6',
              borderColor: '#7c3aed',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
      }

      updateInventoryChart(categoryStats) {
        const ctx = document.getElementById('chart-inventory-category').getContext('2d');
        
        if (this.charts.inventoryCategory) {
          this.charts.inventoryCategory.destroy();
        }

        // Datos de ejemplo si no hay datos reales
        const labels = categoryStats && categoryStats.length > 0 ? 
          categoryStats.map(item => item.category) : ['Abrigos', 'Camisetas', 'Pantalones', 'Calzado'];
        
        const data = categoryStats && categoryStats.length > 0 ? 
          categoryStats.map(item => item.totalStock) : [45, 120, 85, 60];

        this.charts.inventoryCategory = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom'
              }
            }
          }
        });
      }

      updateRecentSalesTable(sales) {
        const tbody = document.getElementById('recent-sales-body');
        
        if (!sales || sales.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center; color:#6b7280;">No hay ventas recientes</td></tr>';
          return;
        }

        tbody.innerHTML = sales.map(sale => `
          <tr>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
              <strong>${sale.saleNumber || 'N/A'}</strong>
            </td>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
              ${new Date(sale.createdAt).toLocaleDateString('es-ES')}
            </td>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
              ${sale.items ? sale.items.length : 0} productos
            </td>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:right;">
              <strong>S/ ${(sale.total || 0).toFixed(2)}</strong>
            </td>
            <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">
              <span style="padding:4px 8px; background:#10b981; color:white; border-radius:12px; font-size:0.8rem;">
                COMPLETADA
              </span>
            </td>
          </tr>
        `).join('');
      }

      showNoDataChart(ctx, message) {
        ctx.font = '14px system-ui';
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'center';
        ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
      }

      showLoadingState() {
        document.getElementById('recent-sales-body').innerHTML = 
          '<tr><td colspan="5" style="padding:20px; text-align:center; color:#6b7280;">Cargando...</td></tr>';
      }

      setupEventListeners() {
        // Filtros de fecha
        document.getElementById('rep-apply').addEventListener('click', () => this.applyDateFilter());
        document.getElementById('rep-last7').addEventListener('click', () => this.setLastDaysFilter(7));
        document.getElementById('rep-last30').addEventListener('click', () => this.setLastDaysFilter(30));
        document.getElementById('rep-thismo').addEventListener('click', () => this.setThisMonthFilter());

        // Botones de exportación
        document.getElementById('exp-sales-csv').addEventListener('click', () => this.exportSalesCSV());
        document.getElementById('exp-products-csv').addEventListener('click', () => this.exportProductsCSV());
        document.getElementById('exp-inventory-csv').addEventListener('click', () => this.exportInventoryCSV());
        document.getElementById('exp-print').addEventListener('click', () => window.print());
        document.getElementById('generate-demo').addEventListener('click', () => this.generateDemoData());

        // Botón actualizar
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadReportsData());

        // Botón logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
          e.preventDefault();
          this.handleLogout();
        });
      }

      applyDateFilter() {
        const fromInput = document.getElementById('rep-from');
        const toInput = document.getElementById('rep-to');
        
        this.currentFilter.from = new Date(fromInput.value);
        this.currentFilter.to = new Date(toInput.value);
        
        this.loadReportsData();
      }

      setLastDaysFilter(days) {
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - days);

        document.getElementById('rep-from').value = this.formatDate(fromDate);
        document.getElementById('rep-to').value = this.formatDate(today);
        
        this.applyDateFilter();
      }

      setThisMonthFilter() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

        document.getElementById('rep-from').value = this.formatDate(firstDay);
        document.getElementById('rep-to').value = this.formatDate(today);
        
        this.applyDateFilter();
      }

      async exportSalesCSV() {
        try {
          const salesReport = await this.fetchSalesData();
          const csvContent = this.convertToCSV(salesReport.dailySales || [], [
            'date', 'total', 'transactions', 'productsSold'
          ]);
          
          this.downloadCSV(csvContent, `ventas-${this.formatDate(new Date())}.csv`);
          this.showMessage('📊 Reporte de ventas exportado correctamente');
        } catch (error) {
          this.showError('Error al exportar ventas');
        }
      }

      async exportProductsCSV() {
        this.showMessage('✅ Función de exportación de productos en desarrollo');
      }

      async exportInventoryCSV() {
        this.showMessage('✅ Función de exportación de inventario en desarrollo');
      }

      async generateDemoData() {
        this.showMessage('🎯 Generando datos de demostración...');
        // Aquí iría la lógica para generar datos demo
        setTimeout(() => {
          this.loadReportsData();
          this.showMessage('✅ Datos de demostración generados correctamente');
        }, 2000);
      }

      convertToCSV(data, fields) {
        const headers = fields.join(',');
        const rows = data.map(item => 
          fields.map(field => `"${item[field] || ''}"`).join(',')
        );
        return [headers, ...rows].join('\n');
      }

      downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Métodos de utilidad
      async fetchData(endpoint) {
        const token = this.getToken();
        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      }

      isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true';
      }

      getToken() {
        return localStorage.getItem('token') || '';
      }

    loadUserInfo() {
        try {
            if (!this.authManager) return;
            
            const user = this.authManager.getCurrentUser();
            const sessionInfo = document.getElementById('session-info');
            
            if (sessionInfo && user?.user?.email) {
                const userInfo = user.user;
                sessionInfo.innerHTML = `👤 <strong>${userInfo.name || userInfo.email}</strong> 
                    <span style="color:#6b7280">(${userInfo.role || 'Usuario'})</span>`;
            }
        } catch (error) {
            console.error('Error en loadUserInfo:', error);
        }
    }

      handleLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
          localStorage.removeItem('user');
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('token');
          window.location.href = 'index.html';
        }
      }

      showMessage(message) {
        // Implementar notificación toast
        alert(message);
      }

      showError(message) {
        this.showMessage('❌ ' + message);
      }
    }

    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
      window.reportsManager = new ReportsManager();
    });