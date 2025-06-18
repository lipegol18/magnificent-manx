// Implementação dos filtros funcionais para relatórios
// Função para construir URL com filtros
const buildFilterUrl = (baseUrl: string, filters: {
  statusFilter?: string | null;
  dateRange?: {startDate: string | null; endDate: string | null};
  hospitalFilter?: number | null;
  complexityFilter?: string | null;
  doctorFilter?: number | null;
  isAdmin?: boolean;
}) => {
  const params = new URLSearchParams();
  
  if (filters.statusFilter) params.append('status', filters.statusFilter);
  if (filters.dateRange?.startDate) params.append('startDate', filters.dateRange.startDate);
  if (filters.dateRange?.endDate) params.append('endDate', filters.dateRange.endDate);
  if (filters.hospitalFilter) params.append('hospitalId', filters.hospitalFilter.toString());
  if (filters.complexityFilter) params.append('complexity', filters.complexityFilter);
  
  // Adicionar filtro por médico apenas para admin, médicos já vêm filtrados pelo backend
  if (filters.isAdmin && filters.doctorFilter) {
    params.append('userId', filters.doctorFilter.toString());
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

// Hook para consultas com filtros
const useFilteredReportData = (filters: any) => {
  return useQuery({
    queryKey: ['reports', 'filtered', filters],
    queryFn: async () => {
      const results = await Promise.allSettled([
        fetch(buildFilterUrl('/api/reports/elective-vs-emergency', filters)).then(r => r.json()),
        fetch(buildFilterUrl('/api/reports/cancellation-rate', filters)).then(r => r.json()),
        fetch(buildFilterUrl('/api/reports/top-procedures', filters)).then(r => r.json()),
        fetch(buildFilterUrl('/api/reports/insurance-distribution', filters)).then(r => r.json()),
        fetch(buildFilterUrl('/api/reports/hospital-distribution', filters)).then(r => r.json()),
        fetch(buildFilterUrl('/api/reports/supplier-distribution', filters)).then(r => r.json()),
      ]);
      
      return {
        electiveVsEmergency: results[0].status === 'fulfilled' ? results[0].value : [],
        cancellationRate: results[1].status === 'fulfilled' ? results[1].value : { rate: 0, cancelledCount: 0, totalCount: 0 },
        topProcedures: results[2].status === 'fulfilled' ? results[2].value : [],
        insuranceDistribution: results[3].status === 'fulfilled' ? results[3].value : [],
        hospitalDistribution: results[4].status === 'fulfilled' ? results[4].value : [],
        supplierDistribution: results[5].status === 'fulfilled' ? results[5].value : [],
      };
    },
    enabled: true,
  });
};

export { buildFilterUrl, useFilteredReportData };