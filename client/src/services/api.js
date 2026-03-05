const BASE = process.env.REACT_APP_API_URL || '/api';

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const configApi = {
  get: () => request('/config'),
  update: (body) => request('/config', { method: 'PUT', body: JSON.stringify(body) })
};

export const departmentsApi = {
  getAll: () => request('/departments'),
  get: (id) => request(`/departments/${id}`),
  create: (body) => request('/departments', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/departments/${id}`, { method: 'DELETE' })
};

export const subjectsApi = {
  getAll: (params) => {
    const q = new URLSearchParams(params).toString();
    return request('/subjects' + (q ? '?' + q : ''));
  },
  get: (id) => request(`/subjects/${id}`),
  getFacultyRooms: (subjectId) => request(`/subjects/${subjectId}/faculty-rooms`),
  setFacultyRooms: (subjectId, facultyRooms) =>
    request(`/subjects/${subjectId}/faculty-rooms`, { method: 'PUT', body: JSON.stringify({ facultyRooms }) }),
  create: (body) => request('/subjects', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/subjects/${id}`, { method: 'DELETE' })
};

export const facultyApi = {
  getAll: () => request('/faculty'),
  get: (id) => request(`/faculty/${id}`),
  create: (body) => request('/faculty', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/faculty/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/faculty/${id}`, { method: 'DELETE' })
};

export const timetablesApi = {
  getAll: (params) => {
    const q = new URLSearchParams(params).toString();
    return request('/timetables' + (q ? '?' + q : ''));
  },
  get: (id) => request(`/timetables/${id}`),
  generate: (semester, options = {}) =>
    request('/timetables/generate', { method: 'POST', body: JSON.stringify({ semester, replaceExisting: options.replaceExisting }) }),
  updateSlot: (id, slotData) => request(`/timetables/${id}/slot`, { method: 'PUT', body: JSON.stringify(slotData) }),
  deleteBySemester: (semester) => request(`/timetables/semester/${semester}`, { method: 'DELETE' })
};

export const authApi = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' })
};

export const publicApi = {
  getDepartments: () => request('/public/departments'),
  getHolidays: () => request('/public/holidays')
};

export const selfApi = {
  facultyTimetable: (semester) => request(`/me/faculty/timetable?semester=${semester || 1}`),
  studentTimetable: (semester) => request(`/me/student/timetable?semester=${semester || 1}`),
  departmentTimetables: (semester) => request(`/me/faculty/department-timetables?semester=${semester || 1}`),
  getHolidays: () => request('/me/holidays')
};
