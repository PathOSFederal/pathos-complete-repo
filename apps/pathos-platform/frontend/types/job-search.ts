export interface JobResult {
  id: number;
  role: string;
  series: string;
  grade: string;
  location: string;
  agency: string;
  type: string;
  estTotalComp: number;
  retirementImpact: string;
  matchPercent: number;
}

export interface RecommendedRole {
  id: number;
  title: string;
  location: string;
  matchPercent: number;
  tags: string[];
}
