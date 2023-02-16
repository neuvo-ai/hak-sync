import { Injectable, Logger } from '@nestjs/common';
import { Cron, Timeout } from '@nestjs/schedule';
import { InjectClient } from 'nest-mysql';
import { Connection } from 'mysql2';
import axios from 'axios';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  public lastSyncIncidents: Date = new Date('2021-01-01T00:00:00Z');
  public lastSyncMeta: Date = new Date('2000-01-01T00:00:00Z');
  public healthy = false;
  public syncing = false;

  constructor(@InjectClient() private readonly connection: Connection) {}

  @Cron('0 0 * * * *')
  handleCron() {
    this.sync();
  }

  @Timeout(10000)
  handleInit() {
    // Do an initial sync on boot after 10 seconds
    this.sync();
  }

  public async getIncidents() {
    // Get the latest incidents with a limit
    const incidents = await this.connection.query(
      `SELECT
      gbv_incident_reports.id,
      gbv_incident_reports.client_referred,
      gbv_incident_reports.survivor_access_justice,
      gbv_incident_reports.survivor_status_id, # AGG
      gbv_incident_reports.crisis_related_survivor_status_id,
      gbv_incident_reports.health_state_id,
      gbv_incident_reports.gbv_related_case,
      gbv_incident_reports.type_of_non_gbv_related,
      gbv_incident_reports.non_intervention,
      gbv_incident_reports.incident_date,
      gbv_incident_reports.category_id,
      gbv_incident_reports.sub_category_id,
      gbv_incident_reports.gbv_crisis_id,
      gbv_incident_reports.place_of_incident_id,
      gbv_incident_reports.details_of_incident_id,
      gbv_incident_reports.has_vulnerability,
      gbv_incident_reports.survivor_emotional_state_start_id,
      gbv_incident_reports.survivor_emotional_state_end_id,
      gbv_incident_reports.client_safe,
      gbv_incident_reports.explained_possible_consequence,
      gbv_incident_reports.client_consent_share_data,
      gbv_incident_reports.tlc_id,
      gbv_incident_reports.status,
      gbv_incident_reports.created_at,
      gbv_incident_reports.updated_at,
      
      # Survivor data
      gbv_survivors_datas.age_estimate,
      gbv_survivors_datas.gender,
      gbv_survivors_datas.county_id,
      gbv_survivors_datas.sub_county_id,
      gbv_survivors_datas.ward_id,
      
      gbv_nature_of_violences.nature_of_violence_id, # AGG
    
      JSON_ARRAYAGG(gbv_nature_of_violences.nature_of_violence_id) as nature_of_violences,
      JSON_ARRAYAGG(gbv_survivor_statuses.survivor_status_id) as survivor_statuses
    
    FROM gbv_incident_reports
    LEFT JOIN gbv_nature_of_violences ON gbv_nature_of_violences.case_id = gbv_incident_reports.id
    LEFT JOIN gbv_survivor_statuses ON gbv_survivor_statuses.case_id = gbv_incident_reports.id
    LEFT JOIN gbv_survivors_datas ON gbv_survivors_datas.case_id = gbv_incident_reports.id
    WHERE gbv_incident_reports.updated_at > "2000-01-01 00:00:00"
    GROUP BY
      gbv_nature_of_violences.case_id,
      gbv_survivor_statuses.case_id,

      gbv_incident_reports.id,
      gbv_incident_reports.client_referred,
      gbv_incident_reports.survivor_access_justice,
      gbv_incident_reports.survivor_status_id, # AGG
      gbv_incident_reports.crisis_related_survivor_status_id,
      gbv_incident_reports.health_state_id,
      gbv_incident_reports.gbv_related_case,
      gbv_incident_reports.type_of_non_gbv_related,
      gbv_incident_reports.non_intervention,
      gbv_incident_reports.incident_date,
      gbv_incident_reports.category_id,
      gbv_incident_reports.sub_category_id,
      gbv_incident_reports.gbv_crisis_id,
      gbv_incident_reports.place_of_incident_id,
      gbv_incident_reports.details_of_incident_id,
      gbv_incident_reports.has_vulnerability,
      gbv_incident_reports.survivor_emotional_state_start_id,
      gbv_incident_reports.survivor_emotional_state_end_id,
      gbv_incident_reports.client_safe,
      gbv_incident_reports.explained_possible_consequence,
      gbv_incident_reports.client_consent_share_data,
      gbv_incident_reports.tlc_id,
      gbv_incident_reports.status,
      gbv_incident_reports.created_at,
      gbv_incident_reports.updated_at,
      gbv_survivors_datas.age_estimate,
      gbv_survivors_datas.gender,
      gbv_survivors_datas.county_id,
      gbv_survivors_datas.sub_county_id,
      gbv_survivors_datas.ward_id,
      gbv_survivors_datas.created_at,
      gbv_survivors_datas.updated_at,
      gbv_survivors_datas.case_id,
      gbv_nature_of_violences.nature_of_violence_id
    ORDER BY gbv_incident_reports.updated_at
    LIMIT 500
      `,
      [this.lastSyncIncidents],
    );
    return incidents[0];
  }

  public async getData() {
    const incidents = await this.getIncidents();
    for (const incident of incidents) {
      // Remove nulls
      ['nature_of_violences', 'survivor_statuses'].forEach(
        (k) => (incident[k] = incident[k].filter((v) => v)),
      );

      // Typecast booleans
      [
        'client_referred',
        'survivor_access_justice',
        'gbv_related_case',
        'has_vulnerability',
        'client_safe',
        'explained_possible_consequence',
        'client_consent_share_data',
      ].forEach((k) => (incident[k] = incident[k] === 'yes'));
    }
    return incidents;
  }

  public async getMeta() {
    this.logger.log('Getting metadata');
    const globalTableConfig = ['id', 'name', 'created_at', 'updated_at'];
    const tablesConfig = {
      actions_to_safeguard_clients: [],
      age_brackets: ['-name', 'min', 'max'],
      crisis_related_survivor_statuses: [],
      displacement_statuses: [],
      domestic_relations: [],
      case_categories: [],
      case_sub_categories: ['-name', 'sub_category_name', 'case_category_id'],
      gbvrc_contacts: [
        '-name',
        'gbv_name',
        'phone_number_1',
        'phone_number_2',
        'email_address',
      ],
      gbv_crises: [],
      gbv_crisis_abductions: [],
      gbv_locations: [],
      gb_crises: [],

      health_centers_contacts: [
        '-name',
        'center_name',
        'county_id',
        'phone_number_1',
        'phone_number_2',
        'email_address',
      ],
      health_states: [],
      impacts_of_violences: [],
      incident_details_statuses: [],
      medical_facilities: [],
      medical_service_referrals: [],
      perpetrator_statuses: [],
      perptrator_occupations: [],
      places_of_incidents: [],
      political_events: [],
      psychosocial_facilities: [],
      psychosocial_referrals: [],
      referrals: [],
      referral_types: [],
      roles_of_gbv_perpetrators: [],
      safe_house_referrals: [],
      security_service_referrals: [],
      survivors_of_gbv_crises: [],
      survivor_emotional_states_ends: [],
      survivor_emotional_states_starts: [],
      survivor_statuses: [],
      vulnerabilities: [],
    };

    const output = {};

    const subCounties = await this.getSubCounties();

    const counties = await this.getCounties();

    output['counties'] = counties.map(
      (county) =>
        (county.subcounties = subCounties.filter(
          (subCounty) => subCounty.county_id === county.id,
        )),
    );

    for (const [table, tableConfig] of Object.entries(tablesConfig)) {
      const config = [...globalTableConfig];
      tableConfig.forEach((field) => {
        if (field.startsWith('-')) {
          const index = config.indexOf(field.replace('-', ''));
          if (index !== -1) {
            config.splice(index, 1);
          }
        } else {
          config.push(field);
        }
      });
      this.logger.log(`Getting data for ${table}`);
      output[table] = await this.getTableData(table, config);
    }
    return output;
  }

  public async getCounties() {
    this.logger.log('Getting counties');
    const counties = await this.connection.query(
      `SELECT
        counties.id,
        counties.name,
        counties.latitude,
        counties.longitude,
        counties.created_at,
        counties.updated_at
      FROM counties
      WHERE counties.updated_at > ?
      LIMIT 5000
      `,
      [this.lastSyncMeta],
    );
    return counties[0];
  }

  public async getSubCounties() {
    this.logger.log('Getting sub counties');
    const subCounties = await this.connection.query(
      `SELECT
        sub_counties.id,
        sub_counties.subcounty as name,
        sub_counties.county_id,
        sub_counties.latitude,
        sub_counties.longitude,
        sub_counties.created_at,
        sub_counties.updated_at
      FROM sub_counties
      WHERE sub_counties.updated_at > ?
      ORDER BY sub_counties.updated_at
      LIMIT 5000
      `,
      [this.lastSyncMeta],
    );
    return subCounties[0];
  }

  // WARNING: The inputs should be sanitized before sending here
  public async getTableData(table: string, fields: string[]) {
    // We are manually building the query here but the config is static here to avoid any security implications

    const select = fields
      .map(
        (field, index) =>
          `${table}.${field}` + (index + 1 < fields.length ? ',' : ''),
      )
      .join('\n');

    const contents = await this.connection.query(
      `SELECT
        ${select}
      FROM ${table}
      WHERE updated_at > ?
      ORDER BY updated_at
      LIMIT 50000
      `,
      [this.lastSyncMeta],
    );
    return contents[0];
  }

  public async uploadData(data) {
    return axios
      .post(`${process.env.NEUVO_STATS_API}/external/sync/data`, {
        apiKey: process.env.NEUVO_SECRET,
        name: 'hak',
        data,
      })
      .then((response) => {
        this.debugResponse(response);
        return response.data;
      })
      .catch((error) => {
        this.debugError(error);
        throw 'Error uploading data!';
      });
  }

  public async uploadMeta(data) {
    return axios
      .post(`${process.env.NEUVO_STATS_API}/external/sync/meta`, {
        apiKey: process.env.NEUVO_SECRET,
        name: 'hak',
        data,
      })
      .then((response) => {
        this.debugResponse(response);
        return response.data;
      })
      .catch((error) => {
        this.debugError(error);
        throw 'Error uploading meta data!';
      });
  }

  public async updateLastSync(type: 'meta' | 'data' = 'meta') {
    this.logger.log('Updating last sync');
    try {
      const { data } = await axios.get<any>(
        `${process.env.NEUVO_STATS_API}/external/sync/last`,
        {
          params: { type, name: 'hak' },
        },
      );
      this.debugResponse(data);
      if (type == 'data') {
        this.lastSyncIncidents = new Date(data.date);
      } else {
        this.lastSyncMeta = new Date(data.date);
      }
    } catch (error) {
      this.debugError(error);
      this.logger.error('Error fetching last sync dates!');
      throw 'Error fetching last sync dates!';
    }
  }

  public async sync() {
    try {
      if (this.syncing) {
        this.logger.error('Sync already in progress');
        return;
      }
      this.syncing = true;
      this.logger.log('Syncing data');
      await this.updateLastSync('data');
      const data = await this.getData();
      await this.uploadData(data);
      await this.updateLastSync('meta');
      const meta = await this.getMeta();
      await this.uploadMeta(meta);
      this.syncing = false;
      this.logger.verbose('Done syncing');
    } catch (e) {
      this.logger.error(e);
    }
  }

  private debugResponse(response) {
    try {
      this.logger.debug('Request URL: ', response.request.responseURL);
      this.logger.debug('Request Method: ', response.config.method);
      //this.logger.debug('Request Data: ', response.config.data);
      this.logger.debug('Request Headers: ', response.config.headers);
      this.logger.debug('Response Status Code: ', response.status);
      this.logger.debug('Response Headers: ', response.headers);
      this.logger.debug('Response Data: ', response.data);
    } catch (e) {
      this.logger.error(e);
    }
  }

  private debugError(error) {
    try {
      this.logger.error('Request Error: ', error);
      this.logger.error('Request URL: ', error.request.responseURL);
      this.logger.error('Request Method: ', error.config.method);
      //this.logger.error('Request Data: ', error.config.data);
      this.logger.error('Request Headers: ', error.config.headers);
      this.logger.error('Response Data: ', error.response?.data);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
