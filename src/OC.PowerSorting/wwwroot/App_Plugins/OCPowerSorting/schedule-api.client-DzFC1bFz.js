import { P as t, A as a } from "./api-response.utils-UvM8kS4m.js";
class E {
  constructor(e) {
    this.getAuthToken = e;
  }
  async makeRequest(e, s = {}) {
    const n = await this.getAuthToken(), o = new Headers(s.headers);
    return o.set("Content-Type", "application/json"), n && o.set("Authorization", `Bearer ${n}`), fetch(e, {
      ...s,
      headers: o
    });
  }
  async getSchedules(e) {
    const s = e ? `${t.API_BASE}${t.ENDPOINTS.SCHEDULES}?parentId=${e}` : `${t.API_BASE}${t.ENDPOINTS.SCHEDULES}`, n = await this.makeRequest(s);
    return a.handleResponse(n);
  }
  async getSchedule(e) {
    const s = await this.makeRequest(
      `${t.API_BASE}${t.ENDPOINTS.SCHEDULES}/${e}`
    );
    return a.handleResponse(s);
  }
  async createSchedule(e) {
    const s = await this.makeRequest(
      `${t.API_BASE}${t.ENDPOINTS.SCHEDULES}`,
      {
        method: "POST",
        body: JSON.stringify(e)
      }
    );
    return a.handleResponse(s);
  }
  async updateSchedule(e, s) {
    const n = await this.makeRequest(
      `${t.API_BASE}${t.ENDPOINTS.SCHEDULES}/${e}`,
      {
        method: "PUT",
        body: JSON.stringify(s)
      }
    );
    return a.handleResponse(n);
  }
  async deleteSchedule(e) {
    const s = await this.makeRequest(
      `${t.API_BASE}${t.ENDPOINTS.SCHEDULES}/${e}`,
      { method: "DELETE" }
    );
    await a.handleResponse(s);
  }
  async getActiveSchedules(e) {
    const s = await this.makeRequest(
      `${t.API_BASE}${t.ENDPOINTS.SCHEDULES_ACTIVE}/${e}`
    );
    return a.handleResponse(s);
  }
}
export {
  E as S
};
//# sourceMappingURL=schedule-api.client-DzFC1bFz.js.map
