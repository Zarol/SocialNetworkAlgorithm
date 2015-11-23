// Define the SVG canvas and initailize the node colors
var width   = window.innerWidth - 35,
    height  = window.innerHeight - 25,
    colors  = d3.scale.category10();

// Create the SVG canvas
var svg = d3.select('body')
    .append('svg')
    .attr('oncontextmenu', 'return false;')
    .attr('width', width)
    .attr('height', height)
    .style('border', 'solid');

// Set up initial nodes & edges
// - Nodes use a unique ID to make them distinct, and a color to represents
//      their group of friends
// - Edges have a source and a target to connect to, and a state which represent
//      the color to take on (green / red)
var nodes = 
    [
        {id: 0, friend: colors(0)},
        {id: 1, friend: colors(1)},
        {id: 2, friend: colors(2)}
    ],
    lastNodeId = 2,
    edges = 
    [
        {source: nodes[0], target: nodes[1], state: 'default'},
        {source: nodes[1], target: nodes[2], state: 'default'}
    ];

// Initialize D3 force layout
//      The force layout makes the graphs physics-based and more interactive
var force = d3.layout.force()
    .nodes(nodes)
    .links(edges)
    .size([width, height])
    .linkDistance(150)  // What length to bind each node to
    .charge(-500)   // How strongly to bind the nodes
    .on('tick', tick);

// Define what line is displayed when dragging edges for new nodes
var drag_line = svg.append('svg:path')
    .attr('class', 'edge dragline hidden')
    .attr('d', 'M0,0L0,0');

// Handles to edge and node element groups
var path = svg.append('svg:g').selectAll('path'),
    circle = svg.append('svg:g').selectAll('g');

// Mouse Event Handlers, used for user interaction
var selected_node = null,
    selected_edge = null,
    mousedown_node = null,
    mousedown_edge = null,
    mouseup_node = null;

// Resets mouse events, used for user interaction
function resetMouseVars() {
    mousedown_node = null;
    mouseup_node = null;
    mousedown_edge = null;
}

// Update Force Layout on every tick
function tick() {
    // Draw edges from source nodes to target nodes
    path.attr('d', function(d) {
        var deltaX = d.target.x - d.source.x,
            deltaY = d.target.y - d.source.y,
            dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            normX = deltaX / dist,
            normY = deltaY / dist,
            sourceX = d.source.x + normX,
            sourceY = d.source.y + normY,
            targetX = d.target.x - normX,
            targetY = d.target.y - normY;

        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    });

    circle.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
    });
}

// Update Graph
function restart() {
    // Edge group
    path = path.data(edges);

    // Change the colors of the edges to the appropriate values
    path.classed('selected', function(d) { return d === selected_edge; });
    path.classed('connected', function(d) { return d.state === 'connected'; });
    path.classed('broken', function(d) { return d.state === 'broken'; });

    // Add new edges
    path.enter().append('svg:path')
        .attr('class', 'edge')
        .classed('selected', function(d) { return d === selected_edge; })
        .on('mousedown', function(d) {
            if(d3.event.ctrlKey) return;

            // Set the selected edge so it may be dashed
            mousedown_edge = d;
            if(mousedown_edge === selected_edge) selected_edge = null;
            else selected_edge = mousedown_edge;
            selected_node = null;
            restart();
        });

    // Remove unused edges
    path.exit().remove();

    // Node group
    circle = circle.data(nodes, function(d) { return d.id; });

    // Highlight the node that is being selected
    circle.selectAll('circle').style('fill', function(d) { 
        return (d === selected_node) ? 
                d3.rgb(d.friend).brighter().toString() : d.friend; });

    // Add new nodes
    var g = circle.enter().append('svg:g');

    g.append('svg:circle')
        .attr('class', 'node')
        .attr('r', 18)
        // Sets the color brighter if iti s selected
        .style('fill', function(d) {
            return (d === selected_node) ?
                    d3.rgb(d.friend).brighter().toString() : d.friend;
        })
        // Enlarge the node if an edge is being dragged to it
        .on('mouseover', function(d) {
            if(!mousedown_node || d === mousedown_node) return;
            // Enlarge target node
            d3.select(this).attr('transform', 'scale(1.5)');
        })
        // Unenlarge the node if the edge moves away from it
        .on('mouseout', function(d) {
            if(!mousedown_node || d === mousedown_node) return;
            // Unenlarge target node
            d3.select(this).attr('transform', '');
        })
        // Select the node or update the edge being drawn
        .on('mousedown', function(d) {
            if(d3.event.ctrlKey) return;

            // Select node
            mousedown_node = d;
            if(mousedown_node === selected_node) selected_node = null;
            else selected_node = mousedown_node;
            selected_edge = null;

            // Reposition drag line
            drag_line.classed('hidden', false)
                .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 
                      'L' + mousedown_node.x + ',' + mousedown_node.y);

            updateEdgeColors();
            restart();
        })
        // Update the edge if it is valid
        .on('mouseup', function(d) {
            if(!mousedown_node) return;

            drag_line.classed('hidden', true);

            // Check if drag-to-self
            mouseup_node = d;
            if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

            // Unenlarge target node
            d3.select(this).attr('transform', '');

            // Add edge to graph, update if already added
            var source = mousedown_node, 
                target = mouseup_node;

            var edge;
            edge = edges.filter( function(l) {
                return (l.source === source && l.target === target);
            })[0];

            if(!edge) {
                edge = {source: source, target: target};
                edges.push(edge);
            }

            // Select new edge
            selected_edge = edge;
            selected_node = null;

            updateEdgeColors();
            restart();
        });

    // Show node IDs
    g.append('svg:text')
        .attr('x', 0)
        .attr('y', 4)
        .attr('class', 'id')
        .text(function(d) { return d.id; } );

    // Remove old nodes
    circle.exit().remove();

    // Set graph in motion
    force.start();
}

// Creates a node on the SVG canvas
function mousedown() {
    svg.classed('active', true);

    if(d3.event.ctrlKey || mousedown_node || mousedown_edge) return;

    // Insert new node at clicked point
    var point = d3.mouse(this),
        node = {id: ++lastNodeId, friend: colors(lastNodeId)};

    node.x = point[0];
    node.y = point[1];
    nodes.push(node);
    selected_node = node;

    updateEdgeColors();

    restart();
}

// Iterates through all the edges and update the valid paths
function updateEdgeColors()
{
    if(selected_node !== null)
    {
        // Check which edges to highlight based on the selected node color
        var compareColor = selected_node.friend;
        for(var e1 = 0; e1 < edges.length; ++e1)
        {
            // If both nodes on an edge are the same color, green
            if(edges[e1].source.friend === compareColor &&
                edges[e1].target.friend === compareColor)
                edges[e1].state = "connected";
            // If only one node on an edge is the correct color, red
            else if(edges[e1].source.friend === compareColor ||
                edges[e1].target.friend === compareColor)
                edges[e1].state = "broken";
            // Keep it black otherwise
            else
                edges[e1].state = "default";
        }
        restart();
    }
    else
    {
        // There is no selected node, so reset all the edges to black
        for(var e2 = 0; e2 < edges.length; ++e2)
            edges[e2].state = "default";
    }
}

// Move the drag line under the mouse if it is dragging
function mousemove() {
    if(!mousedown_node) return;

    // Update drag line
    drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y 
        + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

    restart();
}

// Update the drag line
function mouseup() {
    if(mousedown_node) {
        // Hide the drag line
        drag_line.classed('hidden', true);
    }

    svg.classed('active', false);

    resetMouseVars();
}

// Helper function to delete edges from the graph
function spliceEdgesForNode(node) {
    var toSplice = edges.filter(function(l) {
        return (l.source === node || l.target === node);
    });
    toSplice.map(function(l) {
        edges.splice(edges.indexOf(l), 1);
    });
}

// Only respond to 1 keydown
var lastKeyDown = -1;

// Keyboard controls for the simulation
function keydown() {
    d3.event.preventDefault();

    if(lastKeyDown !== -1) return;
    lastKeyDown = d3.event.keyCode;

    // CTRL - allows you to drag a node
    if(d3.event.keyCode === 17) {
        circle.call(force.drag);
        svg.classed('ctrl', true);
    }

    if(!selected_node && !selected_edge) return;
    
    // Delete & Backspace allow you to delete nodes / edges upon selection
    switch(d3.event.keyCode) {
        case 8: // Backspace
        case 46: // Delete
            if(selected_node) {
                nodes.splice(nodes.indexOf(selected_node), 1);
                spliceEdgesForNode(selected_node);
            } else if(selected_edge) {
                edges.splice(edges.indexOf(selected_edge), 1);
            }
            selected_edge = null;
            selected_node = null;
            restart();
            break;
    }
    if(!selected_node) return;

    // Keys 0 - 9 set the friend group / color of a selected node
    var newFriend = null;
    switch(d3.event.keyCode) {
        case 48: // 0
            newFriend = colors(0);
            break;
        case 49: // 1
            newFriend = colors(1);
            break;
        case 50: // 2
            newFriend = colors(2);
            break;
        case 51: // 3
            newFriend = colors(3);
            break;
        case 52: // 4
            newFriend = colors(4);
            break;
        case 53: // 5
            newFriend = colors(5);
            break;
        case 54: // 6
            newFriend = colors(6);
            break;
        case 55: // 7
            newFriend = colors(7);
            break;
        case 56: // 8
            newFriend = colors(8);
            break;
        case 57: // 9
            newFriend = colors(9);
            break;
    }

    circle.selectAll('circle').style('fill', function(d) {
        if(d === selected_node && newFriend !== null)
            d.friend = newFriend;
        return d.friend; });
}

// Allow another key to be pressed
function keyup() {
    lastKeyDown = -1;

    // CTRL
    if(d3.event.keyCode === 17) {
        circle.on('mousedown.drag', null)
            .on('touchstart.drag', null);
        svg.classed('ctrl', false);
    }
}

// Resizes the SVG canvas when the window resizes
function updateWindow() {
    var x = window.innerWidth - 35;
    var y = window.innerHeight - 25;

    svg.attr('width', x)
        .attr('height', y);
    force.size([x,y]);
    restart();
}

// Resizes the SVG canvas when the window resizes
window.onresize = updateWindow;

// Script starts here
svg.on('mousedown', mousedown)
  .on('mousemove', mousemove)
  .on('mouseup', mouseup);

d3.select(window)
  .on('keydown', keydown)
  .on('keyup', keyup);

restart();