//Load the data
d3.csv("student_mental_health.csv").then(rawData => {
    //Setup the SVG element and the dashboard's size
    const svg = d3.select("svg");
    const fullWidth = 1800;
    const fullHeight = 1000;
    const topRowHeight = fullHeight * 0.4;
    const bottomRowHeight = fullHeight * 0.4;

    function debugNoneCategory() {
        //Count up the total # of students with no conditions
        const noConditionsCount = students.filter(d => 
            d.depression === "No" && 
            d.anxiety === "No" && 
            d.panic === "No"
        ).length;
        
        //Log the first few students with no conditions
        const samplesWithNoConditions = students.filter(d => 
            d.depression === "No" && 
            d.anxiety === "No" && 
            d.panic === "No"
        ).slice(0, 5);
        
        
        //Need to check if these students have a valid CGPA and age for the scatter plot
        const validScatterSamples = samplesWithNoConditions.filter(d => 
            !isNaN(d.age) && CGPAMidpoint(d.CGPA)
        );
        
    }

    //Convert the CGPA ranges that are provided in the dataset into midpoints
    const CGPAMidpoint = (cgpaStr) => {
        if (typeof cgpaStr !== "string") {
            console.warn("Invalid CGPA:", cgpaStr);
            return null;
        }
        const match = cgpaStr.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
        if (!match) return null;
        return (parseFloat(match[1]) + parseFloat(match[2])) / 2;
    };

    const students = rawData.map(d => {
        return {
            gender: d["Choose your gender"],
            age: +d["Age"],
            course: d["What is your course?"],
            year: d["Your current year of Study"],
            CGPA: d["What is your CGPA?"],
            marital: d["Marital status"],
            depression: d["Do you have Depression?"],
            anxiety: d["Do you have Anxiety?"],
            panic: d["Do you have Panic attack?"],
            treatment: d["Did you seek any specialist for a treatment?"]
        };
    });

    students.forEach(d => {
        ["depression", "anxiety", "panic"].forEach(condition => {
            //Ensure all fields of the word yes, are "Yes"
            if (d[condition] && typeof d[condition] === "string" && 
                d[condition].toLowerCase() === "yes") {
                d[condition] = "Yes";
            }
            //Ensure all fields of the word no, are "No"
            else if (d[condition] && typeof d[condition] === "string" && 
                    d[condition].toLowerCase() === "no") {
                d[condition] = "No";
            }
        });
    });

    let selectedCondition = null;
    let brushedStudents = null;

    //Counts the total number of students with each mental health disorder
    const conditionCounts = ["depression", "anxiety", "panic"].map(key => ({
        condition: key.charAt(0).toUpperCase() + key.slice(1),
        count: students.filter(d => d[key] === "Yes").length
    }));

    const studentsWithNoConditions = students.filter(d => 
        d.depression == "No" && 
        d.anxiety == "No" && 
        d.panic == "No"
    ).length;

    conditionCounts.push({
        condition: "None",
        count: studentsWithNoConditions
    })

    debugNoneCategory();

    //Bar chart dimensions
    const margin = { top: 60, right: 30, bottom: 80, left: 80 };
    const chartWidth = fullWidth * 0.3;
    const chartHeight = topRowHeight;
    const chartLeft = 80;
    const chartTop = 80;
    
    //Allows SVG content to go beyond the bounds
    svg.style("overflow", "visible");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    //Title for the bar chart
    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -30)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Overview Reported Mental Health Issues");
    
    g.insert("rect", ":first-child")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("fill", "#f9f9f9")
        .attr("rx", 5)
        .attr("ry", 5);

    //X-scale for the conditions
    const x = d3.scaleBand()
        .domain(conditionCounts.map(d => d.condition))
        .range([0, chartWidth])
        .padding(0.4);

    //Y-scale for the total # of responses
    const y = d3.scaleLinear()
        .domain([0, d3.max(conditionCounts, d => d.count) + 5])
        .nice()
        .range([chartHeight, 0]);

    g.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x));
    
    g.append("g")
        .call(d3.axisLeft(y));

    //X-axis label
    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 40)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .text("Mental Health Condition");
    
    //Y-axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -chartHeight / 2)
        .attr("y", -40)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .text("Number of Students");

    //Draw the bars
    const bars = g.selectAll(".bar")
        .data(conditionCounts)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.condition))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => chartHeight - y(d.count))
        .attr("fill", "#4682b4")
        .style("cursor", "pointer");

    //Labels above bars
    g.selectAll(".label")
        .data(conditionCounts)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d.condition) + x.bandwidth() / 2)
        .attr("y", d => y(d.count) - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "black")
        .text(d => d.count);

    //Dimensions for the scatter plot
    const scatterMargin = {top: 60, right: 30, bottom: 60, left: 80};
    const scatterWidth = fullWidth * 0.55;
    const scatterHeight = topRowHeight;
    const scatterLeft = fullWidth * 0.45;
    const scatterTop = 40;

    const scatterGroup = svg.append("g")
        .attr("transform", `translate(${scatterLeft}, ${scatterTop})`);

    //Filter out the invalid data from the scatter plot
    const scatterData = students.filter(d => !isNaN(d.age) && CGPAMidpoint(d.CGPA));

    //X-scale for CGPA
    const xScatter = d3.scaleLinear()
        .domain(d3.extent(scatterData, d => CGPAMidpoint(d.CGPA)))
        .nice()
        .range([0, scatterWidth]);

    //Y-scale for age
    const yScatter = d3.scaleLinear()
        .domain(d3.extent(scatterData, d => d.age))
        .nice()
        .range([scatterHeight, 0]);
    
    //Anxiety color scale
    const colorScale = d3.scaleOrdinal()
        .domain(["Yes", "No"])
        .range(["#d95f02", "#1b9e77"]);

    //X-axis
    scatterGroup.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(d3.axisBottom(xScatter));

    //Y-axis
    scatterGroup.append("g")
        .call(d3.axisLeft(yScatter));

    //X-axis label
    scatterGroup.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("CGPA (midpoint)");

    //Title for the scatter plot
    scatterGroup.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text("CGPA vs Age, Colored by Anxiety");

    //Create legend
    const legend = scatterGroup.selectAll(".legend")
        .data(colorScale.domain())
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0, ${20 + i * 20})`);

    legend.append("rect")
        .attr("x", scatterWidth)
        .attr("y", 110)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colorScale);
    
    //Labels for the legend
    legend.append("text")
        .attr("x", scatterWidth - 2)
        .attr("y", 120)
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .text(d => `Anxiety: ${d}`);

//Position and size the parallel plot
const parallelMargin = {top: 80, right: 100, bottom: 50, left: 100};
const parallelWidth = fullWidth * 0.8;
const parallelHeight = bottomRowHeight;
const parallelTop = topRowHeight + 120;
const parallelLeft = (fullWidth - parallelWidth) / 2;

//Remove any existing parallel coordinates
d3.select("#parallel-coords-container").remove();

//Create a new container for parallel coordinates
const parallelGroup = svg.append("g")
    .attr("id", "parallel-coords-container")
    .attr("transform", `translate(${parallelLeft}, ${parallelTop})`);

//Title for parallel coordinates
parallelGroup.append("text")
    .attr("x", parallelWidth / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .text("Parallel Coordinates: Gender → CGPA → Age → Anxiety");

//Format the data set for the parallel plot, with necessary fields
const pcData = students
    .map(d => ({
        Gender: d.gender, 
        CGPA: CGPAMidpoint(d.CGPA),
        Age: d.age, 
        Anxiety: d.anxiety
    }))
    .filter(d => d.Gender && d.CGPA && !isNaN(d.Age) && d.Anxiety);

let dimensions = ["Gender", "CGPA", "Age", "Anxiety"];

//Y-scale for each dimension
const yParallel = {};
dimensions.forEach(dim => {
    if (dim === "Gender" || dim === "Anxiety") {
        yParallel[dim] = d3.scalePoint()
            .domain([...new Set(pcData.map(d => d[dim]))])
            .range([parallelHeight - 10, 10]);
    }
    else {
        yParallel[dim] = d3.scaleLinear()
            .domain(d3.extent(pcData, d => d[dim]))
            .range([parallelHeight - 10, 10]);
    }
});

//X-position for parallel coordinates
const xParallel = d3.scalePoint()
    .range([0, parallelWidth])
    .padding(1)
    .domain(dimensions);

//Draw the path for each data point
function path(d) {
    return d3.line()(dimensions.map(p => [xParallel(p), yParallel[p](d[p])]));
}

//Create a group for the zoom transformation
const zoomGroup = parallelGroup.append("g")
    .attr("class", "zoom-group");

//Create a group for the paths inside the zoom group
const pathsGroup = zoomGroup.append("g")
    .attr("class", "paths-group")
    .style("pointer-events", "none");

//Draw initial paths 
pathsGroup.selectAll("path")
    .data(pcData)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", d => d.Anxiety === "Yes" ? "#d95f02" : "#1b9e77")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.5)
    .style("pointer-events", "none"); 

//Create a second group for axes that will also be transformed by zoom
const axesGroup = zoomGroup.append("g")
    .attr("class", "axes-group");

//Draw the axes
dimensions.forEach(function(dim) {
    const axisG = axesGroup.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${xParallel(dim)}, 0)`)
        .call(d3.axisLeft(yParallel[dim]));
        
    //Add the axis title
    axisG.append("text")
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(dim);
});

//Create a rectangle that will capture mouse events
const overlay = parallelGroup.append("rect")
    .attr("class", "zoom-overlay")
    .attr("width", parallelWidth)
    .attr("height", parallelHeight)
    .style("fill", "none")
    .style("pointer-events", "all")
    .style("cursor", "move");

//Zoom for the overlay
overlay.style("pointer-events", "none");

//Modify the updateViews function to update the parallel coordinates
function updatePCView(filtered) {
    //Data for parallel coordinates
    const updatedPCData = filtered
        .map(d => {
            const cgpaMid = CGPAMidpoint(d.CGPA);
            return {
                Gender: d.gender || null,
                CGPA: isNaN(cgpaMid) ? null : cgpaMid,
                Age: isNaN(d.age) ? null : d.age,
                Anxiety: d.anxiety || null
            };
        })
        .filter(d => d.Gender && d.CGPA && !isNaN(d.Age) && d.Anxiety);
    
    //Update paths
    const pcLines = pathsGroup.selectAll("path")
        .data(updatedPCData);
    
    //Remove paths not found in the new dataset
    pcLines.exit()
        .transition()
        .duration(700)
        .style("opacity", 0)
        .remove();
    
    //Add new paths with fade-in
    pcLines.enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => d.Anxiety === "Yes" ? "#d95f02" : "#1b9e77")
        .attr("stroke-width", 1.5)
        .style("opacity", 0)
        .style("pointer-events", "none") 
        .transition()
        .duration(700)
        .style("opacity", 0.7);
    
    //Update all existing paths
    pcLines
        .transition()
        .duration(700)
        .attr("d", path)
        .attr("stroke", d => d.Anxiety === "Yes" ? "#d95f02" : "#1b9e77")
        .style("opacity", 0.7);
    
    //Ensure all paths remain non-interactive
    setTimeout(() => {
        pathsGroup.style("pointer-events", "none");
        pathsGroup.selectAll("path").style("pointer-events", "none");
    }, 50);
}

function updateViews() {
    
    //All students
    let filtered = students;
    
    if (selectedCondition) {
        if (selectedCondition === "none") {
            //Special case for "None", need to show students with no mental health conditions
            filtered = filtered.filter(d => 
                d.depression === "No" && 
                d.anxiety === "No" && 
                d.panic === "No"
            );
        } else {
            //Filter by the selected condition
            filtered = filtered.filter(d => d[selectedCondition] === "Yes");
        }
    }
    
    //Apply brush filter if active
    if (brushedStudents && brushedStudents.length > 0) {
        const brushedMap = new Map();
        brushedStudents.forEach(d => {
            const key = `${d.age}-${d.gender}-${d.CGPA}`;
            brushedMap.set(key, true);
        });
        
        filtered = filtered.filter(d => {
            const key = `${d.age}-${d.gender}-${d.CGPA}`;
            return brushedMap.has(key);
        });
    }
    
    //Filter valid data for scatter plot
    const updatedScatterData = filtered.filter(d => !isNaN(d.age) && CGPAMidpoint(d.CGPA));
    
    //Update the scatter plot
    if (!brushedStudents || brushedStudents.length === 0) {
        //Update point appearance
        scatterGroup.selectAll("circle.student")
            .transition()
            .duration(500)
            .style("opacity", d => {
                //If condition selected, highlight all points that match
                if (selectedCondition) {
                    if (selectedCondition === "none") {
                        //"None" category
                        const hasNoConditions = d.depression === "No" && d.anxiety === "No" && d.panic === "No";
                        return hasNoConditions ? 0.8 : 0.2;
                    } else {
                        return d[selectedCondition] === "Yes" ? 0.8 : 0.2;
                    }
                }
                return 0.5;
            })
            .attr("r", d => {
                //Make selected points larger
                if (selectedCondition) {
                    if (selectedCondition === "none") {
                        //"None" category
                        const hasNoConditions = d.depression === "No" && d.anxiety === "No" && d.panic === "No";
                        return hasNoConditions ? 8 : 6;
                    } else {
                        return d[selectedCondition] === "Yes" ? 8 : 6;
                    }
                }
                return 6;
            });
    }
    
    //Update parallel coordinates
    updatePCView(filtered);
}

    //Add brush to scatter plot
    const brush = d3.brush()
        .extent([[0, 0], [scatterWidth, scatterHeight]])
        .on("end", brushed);

    //Add brush group
    const brushGroup = scatterGroup.append("g")
        .attr("class", "brush")
        .call(brush);

    //Brush instructions
    scatterGroup.append("text")
        .attr("x", 10)
        .attr("y", -15)
        .attr("text-anchor", "start")
        .style("font-size", "14px")
        .style("fill", "#666")
        .text("Drag to brush points");

    scatterGroup.insert("rect", ":first-child") 
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .attr("fill", "#f9f9f9")
        .attr("rx", 5) 
        .attr("ry", 5);

    //Reset brush button
    scatterGroup.append("text")
        .attr("x", scatterWidth - 5)
        .attr("y", -15)
        .attr("text-anchor", "end")
        .style("font-size", "14px")
        .style("cursor", "pointer")
        .style("fill", "blue")
        .text("Reset Brush")
        .on("click", function() {
            brushedStudents = null;
            scatterGroup.select(".brush").call(brush.move, null);
            updateViews();
        });

    //Draw the initial scatter points
    const circles = scatterGroup.selectAll("circle.student")
        .data(scatterData)
        .enter()
        .append("circle")
        .attr("class", "student")
        .attr("cx", d => xScatter(CGPAMidpoint(d.CGPA)))
        .attr("cy", d => yScatter(d.age))
        .attr("r", 6)
        .attr("fill", d => colorScale(d.anxiety))
        .style("opacity", 0.5)
        .style("stroke", "none")
        .style("stroke-width", 1.5);

    parallelGroup.insert("rect", ":first-child")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", parallelWidth)
        .attr("height", parallelHeight)
        .attr("fill", "none")
        .attr("stroke", "#ddd")
        .attr("stroke-width", 1)
        .attr("rx", 5)
        .attr("ry", 5);

    parallelGroup.select("rect")
        .style("cursor", "default")
        .style("pointer-events", "none");

    

    //Brush function
    function brushed() {
        const selection = d3.event.selection;
    
    if (!selection) {
        if (brushedStudents !== null) {
            brushedStudents = null;
            
            //Reset visuals based on selected condition
            scatterGroup.selectAll("circle.student")
                .transition()
                .duration(500)
                .style("opacity", d => {
                    if (selectedCondition) {
                        if (selectedCondition === "none") {
                            //"None" category
                            const hasNoConditions = d.depression === "No" && d.anxiety === "No" && d.panic === "No";
                            return hasNoConditions ? 0.8 : 0.2;
                        } else {
                            return d[selectedCondition] === "Yes" ? 0.8 : 0.2;
                        }
                    }
                    return 0.5;
                })
                .attr("r", d => {
                    if (selectedCondition) {
                        if (selectedCondition === "none") {
                            //"None" category
                            const hasNoConditions = d.depression === "No" && d.anxiety === "No" && d.panic === "No";
                            return hasNoConditions ? 8 : 6;
                        } else {
                            return d[selectedCondition] === "Yes" ? 8 : 6;
                        }
                    }
                    return 6;
                })
                .style("stroke", "none");
            
            updateViews();
        }
        return;
    }
        
        const [[x0, y0], [x1, y1]] = selection;
        
        //Find points within the brush
        brushedStudents = scatterData.filter(d => {
            const cx = xScatter(CGPAMidpoint(d.CGPA));
            const cy = yScatter(d.age);
            return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
        });
        
        //Highlight brushed points
        scatterGroup.selectAll("circle.student")
            .style("stroke", d => {
                const cx = xScatter(CGPAMidpoint(d.CGPA));
                const cy = yScatter(d.age);
                return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) ? "black" : "none";
            })
            .style("opacity", d => {
                const cx = xScatter(CGPAMidpoint(d.CGPA));
                const cy = yScatter(d.age);
                return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) ? 0.8 : 0.2;
            });
        
        updateViews();
    }

    //Bar click handler
    function handleBarClick(d) {
        const clickedCondition = d.condition.toLowerCase();
        
        if (selectedCondition === clickedCondition) {
            //Deselect if already selected
            selectedCondition = null;
            
            //Reset bar colors
            bars.transition()
                .duration(500)
                .attr("fill", "#4682b4");
        } else {
            //Set new selection
            selectedCondition = clickedCondition;
            
            //Update bar colors
            bars.transition()
                .duration(500)
                .attr("fill", function(d) {
                    return d.condition.toLowerCase() === clickedCondition ? "#ff7f03" : "#4682b4";
                });
        }
        
        updateViews();
    }

    //Attach click handler to bars
    bars.on("click", handleBarClick);
    
    //Initial update call
    updateViews();
    
}).catch(error => {
    console.error("Error loading data:", error);
});