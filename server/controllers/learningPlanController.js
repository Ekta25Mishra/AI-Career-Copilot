const LearningPlan = require("../models/LearningPlan");
const JobDescription = require("../models/JobDescription");

const createLearningPlan = async (req, res) => {
    try {
        const {
            jobDescriptionId,
            hoursPerDay,
            daysPerWeek,
            availableDays,
            startDate,
            targetDate
        } = req.body;

        // 1. Validate required fields
        if (
            !jobDescriptionId ||
            !hoursPerDay ||
            !daysPerWeek ||
            !startDate
        ) {
            return res.status(400).json({
                message:
                    "Required learning plan details are missing"
            });
        }

        // 2. Find user's job description
        const jobDescription =
            await JobDescription.findOne({
                _id: jobDescriptionId,
                user: req.user.userId
            });

        if (!jobDescription) {
            return res.status(404).json({
                message: "Job description not found"
            });
        }

        // 3. Skill-gap analysis must exist
        if (!jobDescription.skillGapAnalysis) {
            return res.status(400).json({
                message:
                    "Please complete skill gap analysis first"
            });
        }

        // 4. Get missing required skills
        const missingSkills =
            jobDescription.skillGapAnalysis
                .missing_required_skills || [];

        if (!Array.isArray(missingSkills)) {
            return res.status(400).json({
                message:
                    "Missing skills data is invalid"
            });
        }

        if (missingSkills.length === 0) {
            return res.status(400).json({
                message:
                    "No missing required skills found"
            });
        }

        // 5. Validate hours per day
        if (hoursPerDay < 0.5) {
            return res.status(400).json({
                message:
                    "Hours per day must be at least 0.5"
            });
        }

        // 6. Validate days per week
        if (
            daysPerWeek < 1 ||
            daysPerWeek > 7
        ) {
            return res.status(400).json({
                message:
                    "Days per week must be between 1 and 7"
            });
        }

        // 7. Validate available days
        if (
            availableDays &&
            !Array.isArray(availableDays)
        ) {
            return res.status(400).json({
                message:
                    "Available days must be an array"
            });
        }

        // 8. Calculate weekly learning capacity
        const weeklyHours =
            hoursPerDay * daysPerWeek;

        // 9. Calculate total learning capacity
        let totalLearningHours = null;

        if (targetDate) {
            const start = new Date(startDate);
            const target = new Date(targetDate);

            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(target.getTime())
            ) {
                return res.status(400).json({
                    message:
                        "Invalid start date or target date"
                });
            }

            if (target <= start) {
                return res.status(400).json({
                    message:
                        "Target date must be after start date"
                });
            }

            const differenceInMilliseconds =
                target - start;

            const totalDays =
                Math.ceil(
                    differenceInMilliseconds /
                    (1000 * 60 * 60 * 24)
                );

            const totalWeeks =
                Math.ceil(totalDays / 7);

            totalLearningHours =
                weeklyHours * totalWeeks;
        }

        // 10. Create learning plan
        const learningPlan =
            await LearningPlan.create({
                user: req.user.userId,

                jobDescription:
                    jobDescription._id,

                missingSkills,

                hoursPerDay,

                daysPerWeek,

                availableDays:
                    availableDays || [],

                startDate,

                targetDate:
                    targetDate || null
            });

        // 11. Return created plan
        res.status(201).json({
            message:
                "Learning plan created successfully",

            learningPlan: {
                id: learningPlan._id,

                missingSkills:
                    learningPlan.missingSkills,

                hoursPerDay:
                    learningPlan.hoursPerDay,

                daysPerWeek:
                    learningPlan.daysPerWeek,

                weeklyHours,

                totalLearningHours,

                availableDays:
                    learningPlan.availableDays,

                startDate:
                    learningPlan.startDate,

                targetDate:
                    learningPlan.targetDate,

                status:
                    learningPlan.status
            }
        });

    } catch (error) {

        console.error(
            "Create learning plan error:",
            error.message
        );

        res.status(500).json({
            message:
                "Failed to create learning plan"
        });
    }
};


module.exports = {
    createLearningPlan
};

