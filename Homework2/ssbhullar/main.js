//Load the data
d3.csv("student_mental_health.csv").then(rawData =>{
    //Setup the SVG element and the dashboard's size
    const svg = d3.select("svg");
    const fullWidth = 1800;
    const fullHeight = 1000;
    const topRowHeight = fullHeight * 0.4;
    const bottomRowHeight = fullHeight * 0.4;

    //Converts the CGPA ranges that are provided in the dataset into midpoints
    const CGPAMidpoint = (cgpaStr) => {
        if (typeof cgpaStr !== "string") {
            console.warn("Invalid CGPA:", cgpaStr);
            return null;
        }
        const match = cgpaStr.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
        return (parseFloat(match[1]) + parseFloat(match[2])) / 2;
    };

    //Make the data easier to use
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

    //Counts the total number of students with each mental health disorder
    const conditionCounts = ["depression", "anxiety", "panic"].map(key => ({
        condition: key.charAt(0).toUpperCase() + key.slice(1),
        count: students.filter(d => d[key] === "Yes").length
    }))

    //Bar chart dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    const margin = { top: 60, right: 30, bottom: 80, left: 80};
    const chartWidth = fullWidth * 0.3;
    const chartHeight = topRowHeight;
    const chartLeft = 80;
    const chartTop = 80;
    const chartGroup = svg.append("g")
        .attr("transform", `translate(${chartLeft}, ${chartTop})`);
    
    //Allows SVG content to go beyond the bounds
    svg.style("overflow", "visible")

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)

    //Title for the bar chart
    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -30)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Overview Reported Mental Health Issues")
    
    //X scale for the conditions
    const x = d3.scaleBand()
        .domain(conditionCounts.map(d => d.condition))
        .range([0, chartWidth])
        .padding(0.4);

    //Y scale for total # of responses
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
        .text("Mental Health Condition")
    
    //Y-axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -chartHeight / 2)
        .attr("y", -40)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .text("Number of Students");

    //Bars
    g.selectAll("rect")
        .data(conditionCounts)
        .enter()
        .append("rect")
        .attr("x", d => x(d.condition))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => chartHeight - y(d.count))
        .attr("fill", "#4682b4")

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
        .text(d => d.count)

    //Dimensions for scatter plot
    const scatterMargin = {top: 60, right: 30, bottom: 60, left: 80};
    const scatterWidth = fullWidth * 0.55;
    const scatterHeight = topRowHeight;
    const scatterLeft = fullWidth * 0.45;
    const scatterTop = 40;

    const scatterGroup = svg.append("g")
        .attr("transform", `translate(${scatterLeft}, ${scatterTop})`);

    //Filter out the invalid data from the scatter plot
    const scatterData = students.filter(d => !isNaN(d.age) && CGPAMidpoint(d.CGPA));

    //X scale for CGPA
    const xScatter = d3.scaleLinear()
        .domain(d3.extent(scatterData, d => CGPAMidpoint(d.CGPA)))
        .nice()
        .range([0, scatterWidth]);

    //Y scale for age
    const yScatter = d3.scaleLinear()
        .domain(d3.extent(scatterData, d => d.age))
        .nice()
        .range([scatterHeight, 0]);
    
    //Anxiety color scale
    const colorScale = d3.scaleOrdinal()
        .domain(["Yes", "No"])
        .range(["#d95f02", "#1b9e77"]);

    //X axis
    scatterGroup.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(d3.axisBottom(xScatter));

    //Y axis
    scatterGroup.append("g")
        .call(d3.axisLeft(yScatter));

    scatterGroup.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("CGPA (midpoint)")

    scatterGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -scatterHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("CGPA vs Age, Colored by Anxiety")
    
    //Add circles for each student
    scatterGroup.selectAll("circle")
        .data(scatterData)
        .enter()
        .append("circle")
        .attr("cx", d => xScatter(CGPAMidpoint(d.CGPA)))
        .attr("cy", d => yScatter(d.age))
        .attr("r", 6)
        .attr("fill", d => colorScale(d.anxiety))
        .attr("opacity", 0.5);

    const legend = scatterGroup.selectAll(".legend")
        .data(colorScale.domain())
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(0, ${150 + i * 20})`)

    legend.append("rect")
        .attr("x", scatterWidth - 20)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colorScale);
    
    //Labels for the legend
    legend.append("text")
        .attr("x", scatterWidth - 26)
        .attr("y", 10)
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .text(d => `Anxiety: ${d}`);

    //Positioning and sizing for the parallel plot
    const parallelMargin = {top: 50, right: 60, bottom: 30, left: 60},
        parallelWidth = fullWidth * 0.9,
        parallelHeight = bottomRowHeight;
        const parallelTop = topRowHeight + 120;
        const parallelLeft = (fullWidth - parallelWidth) / 2;
    
    const parallelGroup = svg.append("g")
        .attr("transform", `translate(${parallelLeft}, ${parallelTop})`);

    //Formatting data set for the parellel plot, with necessary fields
    const pcData = students.map(d=> ({
        Gender: d.gender, 
        CGPA: CGPAMidpoint(d.CGPA),
        Age: d.age, 
        Anxiety: d.anxiety
    }));

    const dimensions = ["Gender", "CGPA", "Age", "Anxiety"];

    //Y-scale
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

    //X-position
    const xParallel = d3.scalePoint()
        .range([0, parallelWidth])
        .padding(1)
        .domain(dimensions);
    
    //Drawing lines for the plot
    function path(d) {
        return d3.line()(dimensions.map(p=> [xParallel(p), yParallel[p](d[p])]));
    }

    //Line for each student
    parallelGroup.selectAll("path")
        .data(pcData)
        .enter()
        .append("path")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", d => d.Anxiety === "Yes" ? "#d95f02" : "#1b9e77")
        .style("opacity", 0.5);

    //Each axis
    parallelGroup.selectAll("g.axis")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "axis")
        .attr("transform", d => `translate(${xParallel(d)}, 0)`)
        .each(function(d) {d3.select(this).call(d3.axisLeft(yParallel[d]));})
        .append("text")
        .attr("y", -10)
        .style("text-anchor", "middle")
        .attr("fill", "black")
        .text(d => d);

    //Tile for parallel plot
    parallelGroup.append("text")
        .attr("x", parallelWidth / 2)
        .attr("y", 420)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Parallel Coordinates: Gender -> CGPA -> Age -> Anxiety");

    }).catch(error => {
        console.error("Error loading data:", error);
});
