const normalizeSkill = (skill) => {
    if (typeof skill !== "string") {
        return "";
    }

    let normalized = skill
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");


    // Remove content inside parentheses
    normalized = normalized.replace(
        /\([^)]*\)/g,
        ""
    );


    // Remove common punctuation
    normalized = normalized
        .replace(/[.,]/g, "")
        .trim();


    // Skill aliases
    const aliases = {
        "react.js": "react",
        "reactjs": "react",

        "node.js": "node",
        "nodejs": "node",

        "express.js": "express",
        "expressjs": "express",

        "mongodb": "mongo",
        "mongo db": "mongo",

        "javascript": "js",
        "ecmascript": "js",

        "typescript": "ts",

        "large language models": "llm",
        "large language model": "llm",

        "retrieval augmented generation": "rag",
        "retrieval-augmented generation": "rag"
    };


    return aliases[normalized] || normalized;
};


const areSkillsSimilar = (skill1, skill2) => {

    const normalizedSkill1 =
        normalizeSkill(skill1);

    const normalizedSkill2 =
        normalizeSkill(skill2);


    if (
        !normalizedSkill1 ||
        !normalizedSkill2
    ) {
        return false;
    }


    return normalizedSkill1 === normalizedSkill2;
};


module.exports = {
    normalizeSkill,
    areSkillsSimilar
};