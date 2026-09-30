import { readFile } from 'node:fs/promises';
const {rates:r,assumptions:a,currency,region,retrievedAt}=JSON.parse(await readFile(new URL('pricing-inputs.json',import.meta.url),'utf8'));
const seconds=a.monthHours*3600;
const cpu=seconds*a.workerVcpu, memory=seconds*a.workerGib;
const other=a.monthHours*r.postgresB1msHour+a.postgresGib*r.postgresPremiumSsdGibMonth+
 a.monthHours/24*r.registryBasicDay+a.logGbPerMonth*r.logAnalyticsIngestGb+
 a.fiveMinuteAlerts*r.logAlertFiveMinuteMonth+r.dnsZoneMonth+
 a.dnsQueriesPerMonth/1e6*r.dnsMillionQueries+a.secretOperationsPerMonth/1e4*r.keyVaultTenThousandSecretOperations;
const network=a.monthHours*(r.standardLoadBalancerFirstFiveRulesHour+r.standardPublicIpv4Hour);
const noGrant=cpu*r.containerAppsActiveVcpuSecond+memory*r.containerAppsActiveGibSecond;
const grant=Math.max(0,cpu-180000)*r.containerAppsActiveVcpuSecond+Math.max(0,memory-360000)*r.containerAppsActiveGibSecond;
console.log(JSON.stringify({currency,region,retrievedAt,monthHours:a.monthHours,alwaysActiveWorker:{noFreeGrant:noGrant,fullFreeGrant:grant},otherMonthly:other,conditionalNetworkAllowance:network,monthlyIncludingNetwork:{noFreeGrant:noGrant+other+network,fullFreeGrant:grant+other+network},approx24HoursNoGrant:(noGrant+other+network)/a.monthHours*24,warning:'Planning arithmetic, not an Azure quote or spending cap. See assumptions and excluded charges.'},null,2));
