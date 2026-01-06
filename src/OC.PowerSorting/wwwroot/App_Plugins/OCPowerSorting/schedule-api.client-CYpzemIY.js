class u {
  constructor(e) {
    this.getAuthToken = e, this.baseUrl = "/umbraco/management/api/v1/oc/power-sorting";
  }
  async makeRequest(e, s = {}) {
    const a = await this.getAuthToken(), r = new Headers(s.headers);
    r.set("Content-Type", "application/json"), a && r.set("Authorization", `Bearer ${a}`);
    const t = await fetch(`${this.baseUrl}${e}`, {
      ...s,
      headers: r
    });
    if (!t.ok) {
      const n = await t.text();
      throw new Error(`API Error (${t.status}): ${n}`);
    }
    return t.status === 204 ? {} : t.json();
  }
  /**
   * Get all schedules, optionally filtered by parent
   */
  async getSchedules(e, s) {
    const a = new URLSearchParams();
    e && a.append("parentId", e), s && a.append("activeOnly", "true");
    const r = a.toString(), t = `/schedules${r ? `?${r}` : ""}`;
    return this.makeRequest(t);
  }
  /**
   * Get a single schedule by ID
   */
  async getSchedule(e) {
    return this.makeRequest(`/schedules/${e}`);
  }
  /**
   * Create a new schedule
   */
  async createSchedule(e) {
    return this.makeRequest("/schedules", {
      method: "POST",
      body: JSON.stringify(e)
    });
  }
  /**
   * Update an existing schedule
   */
  async updateSchedule(e, s) {
    return this.makeRequest(`/schedules/${e}`, {
      method: "PUT",
      body: JSON.stringify(s)
    });
  }
  /**
   * Delete a schedule
   */
  async deleteSchedule(e) {
    await this.makeRequest(`/schedules/${e}`, {
      method: "DELETE"
    });
  }
  /**
   * Get active schedules for a parent
   */
  async getActiveSchedules(e) {
    return this.makeRequest(
      `/schedules/active/${e}`
    );
  }
}
export {
  u as S
};
//# sourceMappingURL=schedule-api.client-CYpzemIY.js.map
