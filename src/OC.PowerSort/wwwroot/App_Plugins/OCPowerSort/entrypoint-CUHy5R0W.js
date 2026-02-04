import { UMB_AUTH_CONTEXT as F } from "@umbraco-cms/backoffice/auth";
const M = {
  bodySerializer: (r) => JSON.stringify(
    r,
    (e, t) => typeof t == "bigint" ? t.toString() : t
  )
}, G = ({
  onRequest: r,
  onSseError: e,
  onSseEvent: t,
  responseTransformer: a,
  responseValidator: i,
  sseDefaultRetryDelay: l,
  sseMaxRetryAttempts: c,
  sseMaxRetryDelay: n,
  sseSleepFn: o,
  url: u,
  ...s
}) => {
  let d;
  const E = o ?? ((f) => new Promise((y) => setTimeout(y, f)));
  return { stream: async function* () {
    let f = l ?? 3e3, y = 0;
    const S = s.signal ?? new AbortController().signal;
    for (; !S.aborted; ) {
      y++;
      const z = s.headers instanceof Headers ? s.headers : new Headers(s.headers);
      d !== void 0 && z.set("Last-Event-ID", d);
      try {
        const j = {
          redirect: "follow",
          ...s,
          body: s.serializedBody,
          headers: z,
          signal: S
        };
        let m = new Request(u, j);
        r && (m = await r(u, j));
        const p = await (s.fetch ?? globalThis.fetch)(m);
        if (!p.ok)
          throw new Error(
            `SSE failed: ${p.status} ${p.statusText}`
          );
        if (!p.body) throw new Error("No body in SSE response");
        const g = p.body.pipeThrough(new TextDecoderStream()).getReader();
        let O = "";
        const k = () => {
          try {
            g.cancel();
          } catch {
          }
        };
        S.addEventListener("abort", k);
        try {
          for (; ; ) {
            const { done: V, value: _ } = await g.read();
            if (V) break;
            O += _;
            const $ = O.split(`

`);
            O = $.pop() ?? "";
            for (const L of $) {
              const J = L.split(`
`), T = [];
              let I;
              for (const b of J)
                if (b.startsWith("data:"))
                  T.push(b.replace(/^data:\s*/, ""));
                else if (b.startsWith("event:"))
                  I = b.replace(/^event:\s*/, "");
                else if (b.startsWith("id:"))
                  d = b.replace(/^id:\s*/, "");
                else if (b.startsWith("retry:")) {
                  const U = Number.parseInt(
                    b.replace(/^retry:\s*/, ""),
                    10
                  );
                  Number.isNaN(U) || (f = U);
                }
              let x, B = !1;
              if (T.length) {
                const b = T.join(`
`);
                try {
                  x = JSON.parse(b), B = !0;
                } catch {
                  x = b;
                }
              }
              B && (i && await i(x), a && (x = await a(x))), t?.({
                data: x,
                event: I,
                id: d,
                retry: f
              }), T.length && (yield x);
            }
          }
        } finally {
          S.removeEventListener("abort", k), g.releaseLock();
        }
        break;
      } catch (j) {
        if (e?.(j), c !== void 0 && y >= c)
          break;
        const m = Math.min(
          f * 2 ** (y - 1),
          n ?? 3e4
        );
        await E(m);
      }
    }
  }() };
}, Q = (r) => {
  switch (r) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
}, X = (r) => {
  switch (r) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
}, K = (r) => {
  switch (r) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
}, D = ({
  allowReserved: r,
  explode: e,
  name: t,
  style: a,
  value: i
}) => {
  if (!e) {
    const n = (r ? i : i.map((o) => encodeURIComponent(o))).join(X(a));
    switch (a) {
      case "label":
        return `.${n}`;
      case "matrix":
        return `;${t}=${n}`;
      case "simple":
        return n;
      default:
        return `${t}=${n}`;
    }
  }
  const l = Q(a), c = i.map((n) => a === "label" || a === "simple" ? r ? n : encodeURIComponent(n) : A({
    allowReserved: r,
    name: t,
    value: n
  })).join(l);
  return a === "label" || a === "matrix" ? l + c : c;
}, A = ({
  allowReserved: r,
  name: e,
  value: t
}) => {
  if (t == null)
    return "";
  if (typeof t == "object")
    throw new Error(
      "Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these."
    );
  return `${e}=${r ? t : encodeURIComponent(t)}`;
}, P = ({
  allowReserved: r,
  explode: e,
  name: t,
  style: a,
  value: i,
  valueOnly: l
}) => {
  if (i instanceof Date)
    return l ? i.toISOString() : `${t}=${i.toISOString()}`;
  if (a !== "deepObject" && !e) {
    let o = [];
    Object.entries(i).forEach(([s, d]) => {
      o = [
        ...o,
        s,
        r ? d : encodeURIComponent(d)
      ];
    });
    const u = o.join(",");
    switch (a) {
      case "form":
        return `${t}=${u}`;
      case "label":
        return `.${u}`;
      case "matrix":
        return `;${t}=${u}`;
      default:
        return u;
    }
  }
  const c = K(a), n = Object.entries(i).map(
    ([o, u]) => A({
      allowReserved: r,
      name: a === "deepObject" ? `${t}[${o}]` : o,
      value: u
    })
  ).join(c);
  return a === "label" || a === "matrix" ? c + n : n;
}, Y = /\{[^{}]+\}/g, Z = ({ path: r, url: e }) => {
  let t = e;
  const a = e.match(Y);
  if (a)
    for (const i of a) {
      let l = !1, c = i.substring(1, i.length - 1), n = "simple";
      c.endsWith("*") && (l = !0, c = c.substring(0, c.length - 1)), c.startsWith(".") ? (c = c.substring(1), n = "label") : c.startsWith(";") && (c = c.substring(1), n = "matrix");
      const o = r[c];
      if (o == null)
        continue;
      if (Array.isArray(o)) {
        t = t.replace(
          i,
          D({ explode: l, name: c, style: n, value: o })
        );
        continue;
      }
      if (typeof o == "object") {
        t = t.replace(
          i,
          P({
            explode: l,
            name: c,
            style: n,
            value: o,
            valueOnly: !0
          })
        );
        continue;
      }
      if (n === "matrix") {
        t = t.replace(
          i,
          `;${A({
            name: c,
            value: o
          })}`
        );
        continue;
      }
      const u = encodeURIComponent(
        n === "label" ? `.${o}` : o
      );
      t = t.replace(i, u);
    }
  return t;
}, ee = ({
  baseUrl: r,
  path: e,
  query: t,
  querySerializer: a,
  url: i
}) => {
  const l = i.startsWith("/") ? i : `/${i}`;
  let c = (r ?? "") + l;
  e && (c = Z({ path: e, url: c }));
  let n = t ? a(t) : "";
  return n.startsWith("?") && (n = n.substring(1)), n && (c += `?${n}`), c;
};
function te(r) {
  const e = r.body !== void 0;
  if (e && r.bodySerializer)
    return "serializedBody" in r ? r.serializedBody !== void 0 && r.serializedBody !== "" ? r.serializedBody : null : r.body !== "" ? r.body : null;
  if (e)
    return r.body;
}
const re = async (r, e) => {
  const t = typeof e == "function" ? await e(r) : e;
  if (t)
    return r.scheme === "bearer" ? `Bearer ${t}` : r.scheme === "basic" ? `Basic ${btoa(t)}` : t;
}, H = ({
  allowReserved: r,
  array: e,
  object: t
} = {}) => (i) => {
  const l = [];
  if (i && typeof i == "object")
    for (const c in i) {
      const n = i[c];
      if (n != null)
        if (Array.isArray(n)) {
          const o = D({
            allowReserved: r,
            explode: !0,
            name: c,
            style: "form",
            value: n,
            ...e
          });
          o && l.push(o);
        } else if (typeof n == "object") {
          const o = P({
            allowReserved: r,
            explode: !0,
            name: c,
            style: "deepObject",
            value: n,
            ...t
          });
          o && l.push(o);
        } else {
          const o = A({
            allowReserved: r,
            name: c,
            value: n
          });
          o && l.push(o);
        }
    }
  return l.join("&");
}, se = (r) => {
  if (!r)
    return "stream";
  const e = r.split(";")[0]?.trim();
  if (e) {
    if (e.startsWith("application/json") || e.endsWith("+json"))
      return "json";
    if (e === "multipart/form-data")
      return "formData";
    if (["application/", "audio/", "image/", "video/"].some(
      (t) => e.startsWith(t)
    ))
      return "blob";
    if (e.startsWith("text/"))
      return "text";
  }
}, ne = (r, e) => e ? !!(r.headers.has(e) || r.query?.[e] || r.headers.get("Cookie")?.includes(`${e}=`)) : !1, ae = async ({
  security: r,
  ...e
}) => {
  for (const t of r) {
    if (ne(e, t.name))
      continue;
    const a = await re(t, e.auth);
    if (!a)
      continue;
    const i = t.name ?? "Authorization";
    switch (t.in) {
      case "query":
        e.query || (e.query = {}), e.query[i] = a;
        break;
      case "cookie":
        e.headers.append("Cookie", `${i}=${a}`);
        break;
      default:
        e.headers.set(i, a);
        break;
    }
  }
}, N = (r) => ee({
  baseUrl: r.baseUrl,
  path: r.path,
  query: r.query,
  querySerializer: typeof r.querySerializer == "function" ? r.querySerializer : H(r.querySerializer),
  url: r.url
}), v = (r, e) => {
  const t = { ...r, ...e };
  return t.baseUrl?.endsWith("/") && (t.baseUrl = t.baseUrl.substring(0, t.baseUrl.length - 1)), t.headers = W(r.headers, e.headers), t;
}, ie = (r) => {
  const e = [];
  return r.forEach((t, a) => {
    e.push([a, t]);
  }), e;
}, W = (...r) => {
  const e = new Headers();
  for (const t of r) {
    if (!t)
      continue;
    const a = t instanceof Headers ? ie(t) : Object.entries(t);
    for (const [i, l] of a)
      if (l === null)
        e.delete(i);
      else if (Array.isArray(l))
        for (const c of l)
          e.append(i, c);
      else l !== void 0 && e.set(
        i,
        typeof l == "object" ? JSON.stringify(l) : l
      );
  }
  return e;
};
class q {
  constructor() {
    this.fns = [];
  }
  clear() {
    this.fns = [];
  }
  eject(e) {
    const t = this.getInterceptorIndex(e);
    this.fns[t] && (this.fns[t] = null);
  }
  exists(e) {
    const t = this.getInterceptorIndex(e);
    return !!this.fns[t];
  }
  getInterceptorIndex(e) {
    return typeof e == "number" ? this.fns[e] ? e : -1 : this.fns.indexOf(e);
  }
  update(e, t) {
    const a = this.getInterceptorIndex(e);
    return this.fns[a] ? (this.fns[a] = t, e) : !1;
  }
  use(e) {
    return this.fns.push(e), this.fns.length - 1;
  }
}
const oe = () => ({
  error: new q(),
  request: new q(),
  response: new q()
}), ce = H({
  allowReserved: !1,
  array: {
    explode: !0,
    style: "form"
  },
  object: {
    explode: !0,
    style: "deepObject"
  }
}), le = {
  "Content-Type": "application/json"
}, R = (r = {}) => ({
  ...M,
  headers: le,
  parseAs: "auto",
  querySerializer: ce,
  ...r
}), fe = (r = {}) => {
  let e = v(R(), r);
  const t = () => ({ ...e }), a = (u) => (e = v(e, u), t()), i = oe(), l = async (u) => {
    const s = {
      ...e,
      ...u,
      fetch: u.fetch ?? e.fetch ?? globalThis.fetch,
      headers: W(e.headers, u.headers),
      serializedBody: void 0
    };
    s.security && await ae({
      ...s,
      security: s.security
    }), s.requestValidator && await s.requestValidator(s), s.body !== void 0 && s.bodySerializer && (s.serializedBody = s.bodySerializer(s.body)), (s.body === void 0 || s.serializedBody === "") && s.headers.delete("Content-Type");
    const d = N(s);
    return { opts: s, url: d };
  }, c = async (u) => {
    const { opts: s, url: d } = await l(u), E = {
      redirect: "follow",
      ...s,
      body: te(s)
    };
    let w = new Request(d, E);
    for (const h of i.request.fns)
      h && (w = await h(w, s));
    const C = s.fetch;
    let f = await C(w);
    for (const h of i.response.fns)
      h && (f = await h(f, w, s));
    const y = {
      request: w,
      response: f
    };
    if (f.ok) {
      const h = (s.parseAs === "auto" ? se(f.headers.get("Content-Type")) : s.parseAs) ?? "json";
      if (f.status === 204 || f.headers.get("Content-Length") === "0") {
        let g;
        switch (h) {
          case "arrayBuffer":
          case "blob":
          case "text":
            g = await f[h]();
            break;
          case "formData":
            g = new FormData();
            break;
          case "stream":
            g = f.body;
            break;
          default:
            g = {};
            break;
        }
        return s.responseStyle === "data" ? g : {
          data: g,
          ...y
        };
      }
      let p;
      switch (h) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "json":
        case "text":
          p = await f[h]();
          break;
        case "stream":
          return s.responseStyle === "data" ? f.body : {
            data: f.body,
            ...y
          };
      }
      return h === "json" && (s.responseValidator && await s.responseValidator(p), s.responseTransformer && (p = await s.responseTransformer(p))), s.responseStyle === "data" ? p : {
        data: p,
        ...y
      };
    }
    const S = await f.text();
    let z;
    try {
      z = JSON.parse(S);
    } catch {
    }
    const j = z ?? S;
    let m = j;
    for (const h of i.error.fns)
      h && (m = await h(j, f, w, s));
    if (m = m || {}, s.throwOnError)
      throw m;
    return s.responseStyle === "data" ? void 0 : {
      error: m,
      ...y
    };
  }, n = (u) => (s) => c({ ...s, method: u }), o = (u) => async (s) => {
    const { opts: d, url: E } = await l(s);
    return G({
      ...d,
      body: d.body,
      headers: d.headers,
      method: u,
      onRequest: async (w, C) => {
        let f = new Request(w, C);
        for (const y of i.request.fns)
          y && (f = await y(f, d));
        return f;
      },
      url: E
    });
  };
  return {
    buildUrl: N,
    connect: n("CONNECT"),
    delete: n("DELETE"),
    get: n("GET"),
    getConfig: t,
    head: n("HEAD"),
    interceptors: i,
    options: n("OPTIONS"),
    patch: n("PATCH"),
    post: n("POST"),
    put: n("PUT"),
    request: c,
    setConfig: a,
    sse: {
      connect: o("CONNECT"),
      delete: o("DELETE"),
      get: o("GET"),
      head: o("HEAD"),
      options: o("OPTIONS"),
      patch: o("PATCH"),
      post: o("POST"),
      put: o("PUT"),
      trace: o("TRACE")
    },
    trace: n("TRACE")
  };
}, ue = fe(R({
  baseUrl: "https://localhost:44367"
})), he = (r, e) => {
  r.consumeContext(F, async (t) => {
    const a = t?.getOpenApiConfiguration();
    ue.setConfig({
      auth: a?.token ?? void 0,
      baseUrl: a?.base ?? "",
      credentials: a?.credentials ?? "same-origin"
    });
  });
}, ye = (r, e) => {
};
export {
  he as onInit,
  ye as onUnload
};
//# sourceMappingURL=entrypoint-CUHy5R0W.js.map
