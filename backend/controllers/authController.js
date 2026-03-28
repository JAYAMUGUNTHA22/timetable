const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const { signUser, COOKIE_NAME } = require('../middleware/auth');

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false // set true if you serve over HTTPS
};

async function login(req, res) {
  try {
    /* ================= GOOGLE LOGIN ================= */
    // Check if it's a Google login request immediately
    if (req.body.google) {
      try {
        const { email, role, name, departmentId, sectionNumber } = req.body;

        if (!email || !role) {
          return res.status(400).json({ error: 'Google login missing data' });
        }

        let user;

        // ADMIN GOOGLE LOGIN
        if (role === 'admin') {
          user = await User.findOne({ role: 'admin', email });
          if (!user) {
            user = await User.create({
              role: 'admin',
              email,
              name: name || email.split('@')[0],
              passwordHash: null
            });
          }
        }

        // FACULTY GOOGLE LOGIN
        else if (role === 'faculty') {
          const faculty = await Faculty.findOne({ email });
          if (!faculty) return res.status(401).json({ error: 'Faculty email not registered.' });

          user = await User.findOne({ role: 'faculty', faculty: faculty._id });
          if (!user) {
            user = await User.create({
              role: 'faculty',
              faculty: faculty._id,
              email,
              name: faculty.name,
              passwordHash: null
            });
          } else if (user.name !== faculty.name) {
            user.name = faculty.name;
            await user.save();
          }
        }

        // STUDENT GOOGLE LOGIN
        else if (role === 'student') {
          if (!departmentId || !sectionNumber)
            return res.status(400).json({ error: 'Select department & section first' });

          const dept = await Department.findById(departmentId);
          if (!dept) return res.status(400).json({ error: 'Department not found' });

          user = await User.findOne({ role: 'student', email, department: dept._id, sectionNumber });
          if (!user) {
            user = await User.create({
              role: 'student',
              email,
              name: name || email.split('@')[0],
              department: dept._id,
              sectionNumber,
              passwordHash: null
            });
          }
        } else {
          return res.status(403).json({ error: 'Google login is only allowed for Admin role.' });
        }

        if (!user) return res.status(404).json({ error: 'User could not be found or created' });

        const token = signUser(user);
        res.cookie(COOKIE_NAME, token, cookieOptions);

        const userPayload = {
          id: user._id,
          role: user.role,
          email: user.email || null,
          name: user.name || null,
          faculty: user.faculty || null,
          facultyId: role === 'faculty' ? (await Faculty.findById(user.faculty))?.facultyId : null,
          department: user.department || null,
          sectionNumber: user.sectionNumber || null
        };
        if (role === 'faculty' && user.faculty) {
          const fac = await Faculty.findById(user.faculty).populate('homeDepartment', 'name').lean();
          userPayload.departmentName = fac?.homeDepartment?.name || null;
          if (!userPayload.departmentName && userPayload.facultyId) {
            userPayload.departmentName = await getFacultyDepartmentNameFromId(userPayload.facultyId);
          }
        }
        if (role === 'student' && user.department) {
          const dept = await Department.findById(user.department).select('name').lean();
          userPayload.departmentName = dept?.name || null;
        }
        return res.json({ user: userPayload });

      } catch (err) {
        console.error('Google Login error:', err);
        return res.status(500).json({ error: 'Google login failed' });
      }
    }
    /* ================================================= */

    const { role } = req.body || {};
    if (!role) return res.status(400).json({ error: 'Role is required' });

    let user;

    if (role === 'admin') {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
      user = await User.findOne({ role: 'admin', email });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });
    } else if (role === 'faculty') {
      const { facultyId, name, password } = req.body;
      if (!facultyId || !name || !password) {
        return res.status(400).json({ error: 'Faculty ID, name and password are required.' });
      }
      if (password !== 'bitsathy') {
        return res.status(401).json({ error: 'Invalid password.' });
      }
      const faculty = await Faculty.findOne({ facultyId: facultyId.trim() });
      if (!faculty || faculty.name.trim().toLowerCase() !== String(name).trim().toLowerCase()) {
        return res.status(401).json({ error: 'Faculty not found. Check ID and name.' });
      }
      user = await User.findOne({ role: 'faculty', faculty: faculty._id });
      if (!user) {
        user = await User.create({
          role: 'faculty',
          faculty: faculty._id,
          name: faculty.name,
          email: faculty.email || null,
          passwordHash: null
        });
      } else if (user.name !== faculty.name) {
        user.name = faculty.name;
        await user.save();
      }
    } else if (role === 'student') {
      const { email, departmentId, sectionNumber, password } = req.body;
      if (!email || !departmentId || !sectionNumber || !password) {
        return res.status(400).json({ error: 'Email, department, section and password are required.' });
      }
      if (password !== 'bitsathy') {
        return res.status(401).json({ error: 'Invalid password.' });
      }
      const dept = await Department.findById(departmentId);
      if (!dept) return res.status(400).json({ error: 'Department not found.' });
      user = await User.findOne({ role: 'student', email, department: dept._id, sectionNumber });
      if (!user) {
        user = await User.create({
          role: 'student',
          email,
          name: email.split('@')[0],
          department: dept._id,
          sectionNumber,
          passwordHash: null
        });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported role.' });
    }

    const token = signUser(user);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    const userPayload = {
      id: user._id,
      role: user.role,
      name: user.name || null,
      email: user.email || null,
      faculty: user.faculty || null,
      facultyId: role === 'faculty' ? (await Faculty.findById(user.faculty))?.facultyId : null,
      department: user.department || null,
      sectionNumber: user.sectionNumber || null
    };
    if (role === 'faculty' && user.faculty) {
      const fac = await Faculty.findById(user.faculty).populate('homeDepartment', 'name').lean();
      userPayload.departmentName = fac?.homeDepartment?.name || null;
      if (!userPayload.departmentName && userPayload.facultyId) {
        userPayload.departmentName = await getFacultyDepartmentNameFromId(userPayload.facultyId);
      }
    }
    if (role === 'student' && user.department) {
      const dept = await Department.findById(user.department).select('name').lean();
      userPayload.departmentName = dept?.name || null;
    }
    res.json({ user: userPayload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
}

async function getFacultyDepartmentNameFromId(facultyIdStr) {
  if (!facultyIdStr || typeof facultyIdStr !== 'string') return null;
  const match = facultyIdStr.trim().match(/^([A-Za-z]+)/i);
  const prefix = match ? match[1] : '';
  if (!prefix) return null;
  const dept = await Department.findOne({
    $or: [
      { departmentId: new RegExp('^' + prefix, 'i') },
      { name: new RegExp('^' + prefix, 'i') }
    ]
  }).select('name').lean();
  return dept ? dept.name : null;
}

async function me(req, res) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const payload = { ...req.user };
  if (payload.role === 'faculty' && payload.faculty) {
    const faculty = await Faculty.findById(payload.faculty).populate('homeDepartment', 'name departmentId').lean();
    if (faculty) {
      payload.facultyId = faculty.facultyId;
      payload.departmentName = faculty.homeDepartment?.name || null;
      payload.departmentId = faculty.homeDepartment?._id?.toString() || null;
      if (!payload.departmentName && faculty.facultyId) {
        payload.departmentName = await getFacultyDepartmentNameFromId(faculty.facultyId);
      }
    }
  }
  if (payload.role === 'student' && payload.department) {
    const dept = await Department.findById(payload.department).select('name departmentId').lean();
    if (dept) {
      payload.departmentName = dept.name;
      payload.departmentId = dept._id.toString();
    }
  }
  res.json({ user: payload });
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.json({ success: true });
}

module.exports = {
  login,
  me,
  logout
};

