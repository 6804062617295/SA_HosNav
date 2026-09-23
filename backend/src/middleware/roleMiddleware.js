const requireStaffOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Forbidden: Requires Staff or Admin privileges' });
    }

    next();
};

module.exports = { requireStaffOrAdmin };
