export interface Asset {
  id: string;
  sapCode: string;
  binCardNo: number;
  name: string;
  systemInfo: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseBillNo: string;
  vendor: string;
  location: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  status: 'Occupied' | 'Available' | 'Under Maintenance' | 'Lost' | 'Damaged' | 'Scrapped';
  category: string;
  receiverDate: string;
  note: string;
  cost?: number;
}

export interface Employee {
  code: string;
  name: string;
  department: string;
  location: string;
  assetCount: number;
  assets: string[];
}

export interface BinCardEntry {
  date: string;
  action: string;
  employeeName: string;
  department: string;
  note: string;
}

export interface BinCard {
  sapCode: string;
  binCardNo: number;
  systemInfo: string;
  serialNumber: string;
  vendor: string;
  purchaseBillNo: string;
  purchaseDate: string;
  location: string;
  entries: BinCardEntry[];
}

export const assets: Asset[] = [
  { id: '1', sapCode: 'MCD-01', binCardNo: 1, name: 'Dell Vostro 3670', systemInfo: 'Dell Vostro 3670\nI3 8100 / 12RAM / 250 GB SSD', serialNumber: '7G118Q2', purchaseDate: '2018-12-13', purchaseBillNo: 'SM18-19/00408', vendor: 'SM Technologies', location: 'Mumbai', employeeCode: '907', employeeName: 'Saloni Kasare', department: 'Sales', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 35000 },
  { id: '2', sapCode: 'MCD-02', binCardNo: 2, name: 'Dell OptiPlex 5060 Tower', systemInfo: 'Dell OptiPlex 5060 Tower\nI5 8500 / 16 GB / 1TB HDD', serialNumber: '24TRDV2', purchaseDate: '2019-04-22', purchaseBillNo: '', vendor: 'SM Technologies', location: 'Mumbai', employeeCode: '', employeeName: 'Reception', department: 'Reception', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 45000 },
  { id: '3', sapCode: 'MCD-03', binCardNo: 3, name: 'Dell Vostro 3670', systemInfo: 'Dell Vostro 3670\nI3 8100 / 12RAM / 250 GB SSD', serialNumber: '27G89R2', purchaseDate: '', purchaseBillNo: '', vendor: '', location: 'Mumbai', employeeCode: '834', employeeName: 'Asmita Dhuri', department: 'Accounts', status: 'Occupied', category: 'Desktop', receiverDate: '2024-07-08', note: '', cost: 35000 },
  { id: '4', sapCode: 'MCD-04', binCardNo: 4, name: 'Dell OptiPlex 5060 Tower', systemInfo: 'Dell OptiPlex 5060 Tower\nI5 8500 / 8GB / 1TB HDD', serialNumber: '4VDY3W2', purchaseDate: '2019-04-22', purchaseBillNo: 'SM19-20/0039', vendor: 'SM Technologies', location: 'Mumbai', employeeCode: '818', employeeName: 'Hardik Kadam', department: 'Accounts', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 42000 },
  { id: '5', sapCode: 'MCD-06', binCardNo: 6, name: 'Dell Vostro 3471', systemInfo: 'Dell Vostro 3471\nI3 9100 / 8GB / 240GB', serialNumber: 'H6W7P23', purchaseDate: '', purchaseBillNo: '', vendor: '', location: 'Mumbai', employeeCode: '794', employeeName: 'Priyanka Pardhan', department: 'Exim', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 32000 },
  { id: '6', sapCode: 'MCD-09', binCardNo: 9, name: 'Dell Vostro 3470', systemInfo: 'Dell Vostro 3470\nI3 9100 / 8GB / 240GB', serialNumber: '21KQ9W2', purchaseDate: '2019-12-04', purchaseBillNo: 'SM19-20/00405', vendor: 'SM Technologies', location: 'Mumbai', employeeCode: '354', employeeName: 'KVP Mam', department: 'CFO', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 30000 },
  { id: '7', sapCode: 'MCD-10', binCardNo: 10, name: 'Dell Vostro 3470', systemInfo: 'Dell Vostro 3470\nI3 9100 / 8GB / 240GB', serialNumber: 'J8B2CZ2', purchaseDate: '2019-12-04', purchaseBillNo: 'SM19-20/00405', vendor: 'SM Technologies', location: 'Mumbai', employeeCode: '', employeeName: 'TDS-IT Stock', department: 'Accounts', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 30000 },
  { id: '8', sapCode: 'MCD-11', binCardNo: 11, name: 'Dell Vostro 3470', systemInfo: 'Dell Vostro 3470\nI3 9100 / 8GB / 1TB HDD', serialNumber: 'J6Y2CZ2', purchaseDate: '2019-12-04', purchaseBillNo: 'SM19-20/00405', vendor: 'SM Technologies', location: 'Mumbai', employeeCode: '619', employeeName: 'Siddhi Sonar', department: 'Accounts', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 30000 },
  { id: '9', sapCode: 'MCD-13', binCardNo: 13, name: 'Dell Vostro 3670', systemInfo: 'Dell Vostro 3670\nI3 8100 / 12RAM / 1TB HDD', serialNumber: '7FQ18Q2', purchaseDate: '2019-12-04', purchaseBillNo: 'SM18-19/00408', vendor: 'SM Technologies', location: 'Mumbai', employeeCode: '', employeeName: 'CCTV', department: 'Dahej CCTV (503)', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 35000 },
  { id: '10', sapCode: 'MCD-14', binCardNo: 14, name: 'Dell Vostro 3670', systemInfo: 'Dell Vostro 3670\nI3 8100 / 12RAM / 1TB HDD + 1TB SSD', serialNumber: '7F448Q2', purchaseDate: '2019-12-04', purchaseBillNo: 'SM18-19/00408', vendor: 'SM Technologies', location: 'Mumbai', employeeCode: '', employeeName: 'Tally Server', department: 'Tally Server', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 38000 },
  { id: '11', sapCode: 'MCD-15', binCardNo: 15, name: 'Dell Vostro 3670', systemInfo: 'Dell Vostro 3670\nI3 8100 / 12RAM / 250 GB SSD', serialNumber: '7FC18Q2', purchaseDate: '2019-12-04', purchaseBillNo: 'SM18-19/00408', vendor: 'SM Technologies', location: 'Mumbai', employeeCode: '944', employeeName: 'Rani Tiwari', department: 'Accounts', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 35000 },
  { id: '12', sapCode: 'MCD-16', binCardNo: 16, name: 'HP 202 G2 Microtower', systemInfo: 'HP 202 G2 Microtower\nI5 4570 / 6GB / 224 GB', serialNumber: 'INA450Y3FB', purchaseDate: '2018-09-27', purchaseBillNo: '2517/18-19', vendor: 'Thakrar Infotrends', location: 'Mumbai', employeeCode: '619', employeeName: 'Darshana Mahajan', department: 'Accounts', status: 'Occupied', category: 'Desktop', receiverDate: '2025-10-15', note: '', cost: 28000 },
  { id: '13', sapCode: 'MCD-18', binCardNo: 18, name: 'Dell OptiPlex 5090 Tower', systemInfo: 'Dell OptiPlex 5090 Tower\nI5 11500 / 16GB / 240GB', serialNumber: '5BH2FM3', purchaseDate: '2022-02-19', purchaseBillNo: 'GST-21-22-1019', vendor: 'Master Computer Services', location: 'Mumbai', employeeCode: '947', employeeName: 'Sarika Murukate', department: 'Accounts', status: 'Occupied', category: 'Desktop', receiverDate: '2025-10-28', note: '', cost: 52000 },
  { id: '14', sapCode: 'MCD-19', binCardNo: 19, name: 'Dell OptiPlex 5090 Tower', systemInfo: 'Dell OptiPlex 5090 Tower\nI5 11500 / 16GB / 240GB', serialNumber: '89H2FM3', purchaseDate: '2022-02-19', purchaseBillNo: 'GST-21-22-1019', vendor: 'Master Computer Services', location: 'Mumbai', employeeCode: '878', employeeName: 'Namrata Patole', department: 'Exim', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 52000 },
  { id: '15', sapCode: 'MCD-20', binCardNo: 20, name: 'Dell Vostro 3710', systemInfo: 'Dell Vostro 3710\nI5 12400 / 8GB / 500GB', serialNumber: 'DLGD7T3', purchaseDate: '2023-03-30', purchaseBillNo: 'GST-22-23-1300', vendor: 'Master Computer Services', location: 'Mumbai', employeeCode: '909', employeeName: 'Aishwarya Chavan', department: 'Banking', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 48000 },
  { id: '16', sapCode: 'MCD-21', binCardNo: 21, name: 'Dell Vostro 3710', systemInfo: 'Dell Vostro 3710\nI5 12400 / 8GB / 500GB', serialNumber: '49DB7T3', purchaseDate: '2023-03-30', purchaseBillNo: 'GST-22-23-1300', vendor: 'Master Computer Services', location: 'Mumbai', employeeCode: '538', employeeName: 'Priyanka Malusare', department: 'Banking', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 48000 },
  { id: '17', sapCode: 'MCD-22', binCardNo: 22, name: 'Dell Vostro 3710', systemInfo: 'Dell Vostro 3710\nI5 12400 / 8GB / 500GB', serialNumber: '292F7T3', purchaseDate: '2023-03-30', purchaseBillNo: 'GST-22-23-1300', vendor: 'Master Computer Services', location: 'Mumbai', employeeCode: '109', employeeName: 'Nikhil Tale', department: 'Sales', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 48000 },
  { id: '18', sapCode: 'MCD-23', binCardNo: 23, name: 'Dell Vostro 3710', systemInfo: 'Dell Vostro 3710\nI5 12400 / 8GB / 500GB', serialNumber: '1MGD7T3', purchaseDate: '2023-03-30', purchaseBillNo: 'GST-22-23-1300', vendor: 'Master Computer Services', location: 'Mumbai', employeeCode: '388', employeeName: 'Namrata Vilas Gawade', department: 'Banking', status: 'Occupied', category: 'Desktop', receiverDate: '2023-10-07', note: '', cost: 48000 },
  { id: '19', sapCode: 'MCD-24', binCardNo: 24, name: 'Dell Vostro 3710', systemInfo: 'Dell Vostro 3710\nI5 12400 / 8GB / 500GB', serialNumber: '392F7T3', purchaseDate: '2023-03-30', purchaseBillNo: 'GST-22-23-1300', vendor: 'Master Computer Services', location: 'Mumbai', employeeCode: '966', employeeName: 'Swati Gurav', department: 'Accounts', status: 'Occupied', category: 'Desktop', receiverDate: '2025-12-15', note: '', cost: 48000 },
  { id: '20', sapCode: 'MCCPU-01', binCardNo: 25, name: 'Dell V3710', systemInfo: 'Dell V3710\nI5 12400 / 16GB / 512 GB SSD', serialNumber: 'J72F7T3', purchaseDate: '2023-07-07', purchaseBillNo: 'KC/23-24/0188', vendor: 'Kalpendra Computer', location: 'Mumbai', employeeCode: '924', employeeName: 'Roshni Singh', department: 'Banking', status: 'Occupied', category: 'CPU', receiverDate: '2023-10-07', note: '', cost: 55000 },
  { id: '21', sapCode: 'MCCPU-02', binCardNo: 26, name: 'Dell V3710', systemInfo: 'Dell V3710\nI5 12400 / 16GB / 512 GB SSD', serialNumber: 'F8RC7T3', purchaseDate: '2023-07-07', purchaseBillNo: 'KC/23-24/0188', vendor: 'Kalpendra Computer', location: 'Mumbai', employeeCode: '965', employeeName: 'Ajay More', department: 'Exim', status: 'Occupied', category: 'CPU', receiverDate: '2025-12-11', note: '', cost: 55000 },
  { id: '22', sapCode: 'MCCPU-03', binCardNo: 27, name: 'Dell V3710', systemInfo: 'Dell V3710\nI5 12400 / 16GB / 512 GB SSD', serialNumber: 'DFPF7T3', purchaseDate: '2023-07-07', purchaseBillNo: 'KC/23-24/0188', vendor: 'Kalpendra Computer', location: 'Mumbai', employeeCode: '519', employeeName: 'Swati Patel', department: 'Exim', status: 'Occupied', category: 'CPU', receiverDate: '2023-10-07', note: '', cost: 55000 },
  { id: '23', sapCode: 'MCCPU-04', binCardNo: 28, name: 'Dell V3710', systemInfo: 'Dell V3710\nI5 12400 / 16GB / 512 GB SSD', serialNumber: 'G7DB7T3', purchaseDate: '2023-07-07', purchaseBillNo: 'KC/23-24/0188', vendor: 'Kalpendra Computer', location: 'Mumbai', employeeCode: '828', employeeName: 'Ashvi Panchal', department: 'Exim', status: 'Occupied', category: 'CPU', receiverDate: '2024-08-09', note: '', cost: 55000 },
  { id: '24', sapCode: 'MCD-25', binCardNo: 32, name: 'Dell Vostro 3710', systemInfo: 'Dell Vostro 3710\nI5 12400 / 8GB / 512GB', serialNumber: 'FV3LW14', purchaseDate: '2024-04-26', purchaseBillNo: 'M/24-25/260', vendor: 'MAC IT SOLUTION', location: 'Mumbai', employeeCode: '951', employeeName: 'Neha Loke', department: 'Accounts', status: 'Occupied', category: 'Desktop', receiverDate: '2025-11-15', note: '', cost: 46000 },
  { id: '25', sapCode: 'MCD-26', binCardNo: 33, name: 'Dell Vostro 3710', systemInfo: 'Dell Vostro 3710\nI5 12400 / 8GB / 512GB', serialNumber: '5V3LW14', purchaseDate: '2024-04-26', purchaseBillNo: 'M/24-25/260', vendor: 'MAC IT SOLUTION', location: 'Mumbai', employeeCode: '915', employeeName: 'Sushma Prajapati', department: 'Sales', status: 'Occupied', category: 'Desktop', receiverDate: '2024-10-14', note: '', cost: 46000 },
  { id: '26', sapCode: 'MCD-27', binCardNo: 34, name: 'Dell OPTI-7010', systemInfo: 'Dell OPTI-7010\nI5 13500 / 8GB / 512GB', serialNumber: '4FH4324', purchaseDate: '2024-06-04', purchaseBillNo: 'GAC-002051/24-25', vendor: 'GREEN APPLE COMPUNET', location: 'Mumbai', employeeCode: '121', employeeName: 'Rutuja Parab', department: 'Compliance', status: 'Occupied', category: 'Desktop', receiverDate: '2024-09-21', note: '', cost: 58000 },
  { id: '27', sapCode: 'MCD-28', binCardNo: 35, name: 'Dell OPTI-7010', systemInfo: 'Dell OPTI-7010\nI5 13500 / 8GB / 512GB', serialNumber: '6YT3M24', purchaseDate: '2024-06-04', purchaseBillNo: 'GAC-002051/24-25', vendor: 'GREEN APPLE COMPUNET', location: 'Mumbai', employeeCode: '940', employeeName: 'Abin Thomas', department: 'Accounts', status: 'Occupied', category: 'Desktop', receiverDate: '2025-10-10', note: '', cost: 58000 },
  { id: '28', sapCode: 'MCD-29', binCardNo: 36, name: 'Dell OPTI-7010', systemInfo: 'Dell OPTI-7010\nI5 13500 / 8GB / 512GB', serialNumber: '4H55M24', purchaseDate: '2024-06-04', purchaseBillNo: 'GAC-002051/24-25', vendor: 'GREEN APPLE COMPUNET', location: 'Mumbai', employeeCode: '710', employeeName: 'Sukhada Vaje', department: 'Exim', status: 'Occupied', category: 'Desktop', receiverDate: '2024-07-01', note: '', cost: 58000 },
  { id: '29', sapCode: 'MCD-MICON', binCardNo: 37, name: 'Conference System', systemInfo: '', serialNumber: '', purchaseDate: '', purchaseBillNo: '', vendor: 'Ganesh Computer', location: 'Mumbai', employeeCode: '', employeeName: 'Conference 503', department: 'Conference', status: 'Occupied', category: 'Desktop', receiverDate: '2024-07-01', note: '', cost: 15000 },
  { id: '30', sapCode: 'MCD-30', binCardNo: 38, name: 'Dell OPTI-7020', systemInfo: 'Dell OPTI-7020\nI5 12500 / 8GB / 512GB', serialNumber: 'JLH1N24', purchaseDate: '2025-10-02', purchaseBillNo: '', vendor: 'Nageshwar Infotech', location: 'Mumbai', employeeCode: '', employeeName: 'Dolphin', department: 'IT', status: 'Occupied', category: 'Desktop', receiverDate: '2025-10-03', note: '', cost: 52000 },
];

export const departments = ['Accounts', 'Banking', 'Exim', 'Sales', 'Reception', 'CFO', 'Compliance', 'Conference', 'IT', 'Tally Server', 'Dahej CCTV (503)'];

export const employees: Employee[] = [
  { code: '907', name: 'Saloni Kasare', department: 'Sales', location: 'Mumbai', assetCount: 1, assets: ['MCD-01'] },
  { code: '834', name: 'Asmita Dhuri', department: 'Accounts', location: 'Mumbai', assetCount: 1, assets: ['MCD-03'] },
  { code: '818', name: 'Hardik Kadam', department: 'Accounts', location: 'Mumbai', assetCount: 1, assets: ['MCD-04'] },
  { code: '794', name: 'Priyanka Pardhan', department: 'Exim', location: 'Mumbai', assetCount: 1, assets: ['MCD-06'] },
  { code: '354', name: 'KVP Mam', department: 'CFO', location: 'Mumbai', assetCount: 1, assets: ['MCD-09'] },
  { code: '619', name: 'Siddhi Sonar', department: 'Accounts', location: 'Mumbai', assetCount: 1, assets: ['MCD-11'] },
  { code: '619', name: 'Darshana Mahajan', department: 'Accounts', location: 'Mumbai', assetCount: 1, assets: ['MCD-16'] },
  { code: '944', name: 'Rani Tiwari', department: 'Accounts', location: 'Mumbai', assetCount: 1, assets: ['MCD-15'] },
  { code: '947', name: 'Sarika Murukate', department: 'Accounts', location: 'Mumbai', assetCount: 1, assets: ['MCD-18'] },
  { code: '878', name: 'Namrata Patole', department: 'Exim', location: 'Mumbai', assetCount: 1, assets: ['MCD-19'] },
  { code: '909', name: 'Aishwarya Chavan', department: 'Banking', location: 'Mumbai', assetCount: 1, assets: ['MCD-20'] },
  { code: '538', name: 'Priyanka Malusare', department: 'Banking', location: 'Mumbai', assetCount: 1, assets: ['MCD-21'] },
  { code: '109', name: 'Nikhil Tale', department: 'Sales', location: 'Mumbai', assetCount: 1, assets: ['MCD-22'] },
  { code: '388', name: 'Namrata Vilas Gawade', department: 'Banking', location: 'Mumbai', assetCount: 1, assets: ['MCD-23'] },
  { code: '966', name: 'Swati Gurav', department: 'Accounts', location: 'Mumbai', assetCount: 1, assets: ['MCD-24'] },
  { code: '924', name: 'Roshni Singh', department: 'Banking', location: 'Mumbai', assetCount: 1, assets: ['MCCPU-01'] },
  { code: '965', name: 'Ajay More', department: 'Exim', location: 'Mumbai', assetCount: 1, assets: ['MCCPU-02'] },
  { code: '519', name: 'Swati Patel', department: 'Exim', location: 'Mumbai', assetCount: 1, assets: ['MCCPU-03'] },
  { code: '828', name: 'Ashvi Panchal', department: 'Exim', location: 'Mumbai', assetCount: 1, assets: ['MCCPU-04'] },
  { code: '951', name: 'Neha Loke', department: 'Accounts', location: 'Mumbai', assetCount: 1, assets: ['MCD-25'] },
  { code: '915', name: 'Sushma Prajapati', department: 'Sales', location: 'Mumbai', assetCount: 1, assets: ['MCD-26'] },
  { code: '121', name: 'Rutuja Parab', department: 'Compliance', location: 'Mumbai', assetCount: 1, assets: ['MCD-27'] },
  { code: '940', name: 'Abin Thomas', department: 'Accounts', location: 'Mumbai', assetCount: 1, assets: ['MCD-28'] },
  { code: '710', name: 'Sukhada Vaje', department: 'Exim', location: 'Mumbai', assetCount: 1, assets: ['MCD-29'] },
];

export const getDepartmentStats = () => {
  const stats: Record<string, number> = {};
  assets.forEach(a => {
    stats[a.department] = (stats[a.department] || 0) + 1;
  });
  return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

export const getStatusStats = () => {
  const stats: Record<string, number> = {};
  assets.forEach(a => {
    stats[a.status] = (stats[a.status] || 0) + 1;
  });
  return Object.entries(stats).map(([name, value]) => ({ name, value }));
};

export const getVendorStats = () => {
  const stats: Record<string, number> = {};
  assets.forEach(a => {
    if (a.vendor) stats[a.vendor] = (stats[a.vendor] || 0) + 1;
  });
  return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};
