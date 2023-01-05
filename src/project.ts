export type AcesProject = {
  id: string;
  tenantId: string;
  clientId: string;
  adminId: string;
  slug: string;
  created: string;
  updated: string;
  type: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  acesContractDate: string;
  acesContractValue: number;
  acesInvoiceDate: string;
  reportLang: string;
  clientContractDate: string;
  clientInvoiceDate: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export function createProjectTemplate() {
  return {
    id: '',
    tenantId: '',
    clientId: '',
    adminId: '',
    slug: '',
    created: '',
    updated: '',
    type: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    acesContractDate: '',
    acesContractValue: 0,
    acesInvoiceDate: '',
    reportLang: '',
    clientContractDate: '',
    clientInvoiceDate: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  } as AcesProject
}