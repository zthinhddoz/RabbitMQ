
const generateWhereClauses = function (Obj) {
    let whereClause = {}
    if (Obj) {
        Object.keys(Obj).forEach(key => {
            if (Obj[key]) {
                whereClause[key]= Obj[key];
            }
        });
        if (Obj.delt_flg) {
            whereClause.delt_flg = Obj.delt_flg;
        }
    }
    return whereClause;
}

module.exports = generateWhereClauses;


