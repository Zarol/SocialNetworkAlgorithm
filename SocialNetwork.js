// Perform SVG setup for D3.js
var width   = window.innerWidth - 35,
    height  = window.innerHeight - 25,
    colors  = d3.scale.category10();

var svg = d3.select('body')
    .append('svg')
    .attr('oncontextmenu', 'return false;')
    .attr('width', width)
    .attr('height', height)
    .style('border', 'solid');

// Set up initial nodes & edges
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
var force = d3.layout.force()
    .nodes(nodes)
    .links(edges)
    .size([width, height])
    .linkDistance(150)
    .charge(-500)
    .on('tick', tick);

// Define what line is displayed when dragging edges for new nodes
var drag_line = svg.append('svg:path')
    .attr('class', 'edge dragline hidden')
    .attr('d', 'M0,0L0,0');

// Handles to edge and node element groups
var path = svg.append('svg:g').selectAll('path'),
    circle = svg.append('svg:g').selectAll('g');

// Mouse Event Handlers
var selected_node = null,
    selected_edge = null,
    mousedown_node = null,
    mousedown_edge = null,
    mouseup_node = null;

function resetMouseVars() {
    mousedown_node = null;
    mouseup_node = null;
    mousedown_edge = null;
}

// Update Force Layout on every tick
function tick() {
    // Draw edges with proper padding from node centers
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

    // Update existing edges
    path.classed('selected', function(d) { return d === selected_edge; });
    path.classed('connected', function(d) { return d.state === 'connected' });
    path.classed('broken', function(d) { return d.state === 'broken' });

    // Add new edges
    path.enter().append('svg:path')
        .attr('class', 'edge')
        .classed('selected', function(d) { return d === selected_edge; })
        .on('mousedown', function(d) {
            if(d3.event.ctrlKey) return;

            // Select Edge
            mousedown_edge = d;
            if(mousedown_edge === selected_edge) selected_edge = null;
            else selected_edge = mousedown_edge;
            selected_node = null;
            restart();
        });

    // Remove old edges
    path.exit().remove();

    // Node group
    circle = circle.data(nodes, function(d) { return d.id; });

    // Update existing nodes
    circle.selectAll('circle').style('fill', function(d) { 
        return (d === selected_node) ? 
                d3.rgb(d.friend).brighter().toString() : d.friend });

    // Add new nodes
    var g = circle.enter().append('svg:g');

    g.append('svg:circle')
        .attr('class', 'node')
        .attr('r', 18)
        .style('fill', function(d) {
            return (d === selected_node) ?
                    d3.rgb(d.friend).brighter().toString() : d.friend
        })
        .on('mouseover', function(d) {
            if(!mousedown_node || d === mousedown_node) return;
            // Enlarge target node
            d3.select(this).attr('transform', 'scale(1.5)');
        })
        .on('mouseout', function(d) {
            if(!mousedown_node || d === mousedown_node) return;
            // Unenlarge target node
            d3.select(this).attr('transform', '');
        })
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

            restart();
        })
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

function mousedown() {
    svg.classed('active', true);

    if(selected_node !== null)
    {
        var compareColor = selected_node.friend;
        for( var e = 0; e < edges.length; ++e )
        {
            if(edges[e].source.friend === compareColor &&
                edges[e].target.friend === compareColor)
                edges[e].state = "connected";
            else if(edges[e].source.friend === compareColor ||
                edges[e].target.friend === compareColor)
                edges[e].state = "broken";
            else
                edges[e].state = "default";
        }
        restart();
    }

    if(d3.event.ctrlKey || mousedown_node || mousedown_edge) return;

    // Insert new node at clicked point
    var point = d3.mouse(this),
        node = {id: ++lastNodeId, friend: colors(lastNodeId)};

    node.x = point[0];
    node.y = point[1];
    nodes.push(node);
    selected_node = node;

    restart();
}

function mousemove() {
    if(!mousedown_node) return;

    // Update drag line
    drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

    restart();
}

function mouseup() {
    if(mousedown_node) {
        // Hide the drag line
        drag_line.classed('hidden', true);
    }

    svg.classed('active', false);

    resetMouseVars();
}

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

function keydown() {
    d3.event.preventDefault();

    if(lastKeyDown !== -1) return;
    lastKeyDown = d3.event.keyCode;

    // CTRL
    if(d3.event.keyCode === 17) {
        circle.call(force.drag);
        svg.classed('ctrl', true);
    }

    if(!selected_node && !selected_edge) return;
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

function keyup() {
    lastKeyDown = -1;

    // CTRL
    if(d3.event.keyCode === 17) {
        circle.on('mousedown.drag', null)
            .on('touchstart.drag', null);
        svg.classed('ctrl', false);
    }
}

function updateWindow() {
    var x = window.innerWidth - 35;
    var y = window.innerHeight - 25;

    svg.attr('width', x)
        .attr('height', y);
    force.size([x,y]);
    restart();
}

window.onresize = updateWindow;

// Script starts here
svg.on('mousedown', mousedown)
  .on('mousemove', mousemove)
  .on('mouseup', mouseup);

d3.select(window)
  .on('keydown', keydown)
  .on('keyup', keyup);

restart();