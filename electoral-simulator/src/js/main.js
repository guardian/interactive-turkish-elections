define([
    'd3',
    'ractive',
    'underscore',
    'json!data/electionData.json',
    'json!data/profileData.json',
    'text!templates/appTemplate.html',
    'text!templates/hdpTemplate.html',
    'text!templates/profileTemplate.html'
], function(
    d3,
    Ractive,
    _,
    electionData,
    profileData,
    templateHTML,
    hdpTemplate,
    profileTemplate
) {
   'use strict';
    var app;
    var svg;
    var vizContainer;
    var xScale;
    var vizUpdate;
    var currentElectionData;
    var barHeight,barMargin;
    var width,height;
    var transitionSpeed = 800;
    var marginTop = 20;
    var bars;
    var verticalLine;
    var output;
    var oldaffectLength;

    function init(el, context, config, mediator) { 
        output = el;
        var hashValue = window.location.hash;
        if(hashValue){
            hashValue = hashValue.replace('#','')
            if(hashValue === "simulator"){
                simulatorInit('simulator');
            }else if(hashValue === "hdp"){
                simulatorInit('hdp');
            }else if(hashValue.split('_')[0] === "profile"){
                profileInit(hashValue.split('_')[1]);
            }
        }
    }

    function profileInit(party){
        app = new Ractive({
            el:output,
            template:profileTemplate,
            data:{
                data: profileData,
                currentParty: party
            }
        })
    }

    function simulatorInit(template){
        var data = electionData;
        var isInit = true;
        var thresholdInit = true;
        var templateFile;
        if(template === "simulator"){
            templateFile = templateHTML
        }else{
            templateFile = hdpTemplate
        }
        app = new Ractive({
            el:output,
            template:templateFile,
            data:{
                electionData: data,
                currentElection: 'turkey2002',
                threshold:true
            }
        })

        vizContainer = app.find('#vizWrapper');
        
        currentElectionData = app.get('electionData').filter(function(election){
            return election.id === app.get('currentElection');
        })[0];

        app.on('switchDataset',function(e,id){
            app.set('currentElection',id);
        })

        app.observe('currentElection',function(){
            if(!isInit){
                currentElectionData = app.get('electionData').filter(function(election){
                    return election.id === app.get('currentElection');
                })[0];

                drawRectangles(true);
            }
            isInit = false;
        })  

        app.on('switchThreshold',function(e,id){
            app.set('threshold',!app.get('threshold'));
        })

        app.observe('threshold',function(){
            if(!thresholdInit){
                drawRectangles(true);
            }
            thresholdInit = false;
        })  
        window.onresize = function(){
            var newWidth = d3.select(vizContainer).style('width');
            console.log(newWidth,width)
            if(newWidth !== width){
                throttledInit();
            }
        }
        var throttledInit = _.throttle(vizInit,500);
        vizInit(); 
    }

    

    function vizInit(){
        barHeight = 30;
        barMargin = 7;
        width = d3.select(vizContainer).style('width');

        svg = d3.select(vizContainer).html('').append('svg').attr('width',width).attr('shape-rendering','crispEdges')
        bars = svg.append('g').attr('class','bars').attr('transform','translate(0,' + marginTop + ')');
        verticalLine = bars.append('line').attr('x1',0.5).attr('x2',0.5).attr('y1',0).attr('stroke','#E5E5E5')

        drawRectangles(false);
    }





    function drawRectangles(update){
        height = currentElectionData.election_results.length * (barHeight+barMargin) - barMargin + marginTop;
        svg.attr('height',height)
        verticalLine.attr('y2',height)

        xScale = d3.scale.linear()
            .range([0,width])
            .domain([0, currentElectionData.milestones.max_seats])


        var barContainer = bars.selectAll('.barContainer')
            .data(currentElectionData.election_results)

        var barContainerNew = barContainer.enter()
            .append('g')
            .attr('class','barContainer')

        barContainerNew.append('rect').attr('class','with_threshold');
        barContainerNew.append('rect').attr('class','without_threshold');
        barContainerNew.append('g').attr('class','seat_label');
        
        barContainer
            .attr('transform',function(d,i){
                if(!d.threshold_affect){
                    return 'translate(0.5,' + (i * (barHeight+barMargin)) + ')'
                }else if(d.threshold_affect && app.get('threshold')){
                    return 'translate(0.5,' + (i * (barHeight+barMargin)) + ')'
                }else{
                    return 'translate(0.5,' + (i * (barHeight+barMargin)) + ')'
                } 
            })
        
        barContainer.exit().remove() 





        var withoutThresholdBar = barContainer.select('.without_threshold')
            
        withoutThresholdBar
            .attr('height',barHeight)
            .attr('fill',function(d){
                if(!app.get('threshold')){
                    return '#4BC6DF'
                }else{
                    return '#4BC6DF'

                }
            })
            .transition()
            .duration(transitionSpeed)
            .attr('width',function(d){
                if(!app.get('threshold')){
                    return xScale(d.seats_without_threshold)
                }else{
                    if(!d.threshold_affect){
                        return xScale(d.seats_without_threshold)
                    }else{
                        return xScale(d.seats_with_threshold)
                    }
                }
            })





        var withThresholdBar = barContainer.select('.with_threshold')
            
        withThresholdBar
            .attr('fill',function(d){
                if(d.threshold_affect){
                     return '#fff'
                }else{
                     return '#A4E6F3' 
                }
            })
            .attr('stroke',function(d){
                if(d.threshold_affect){
                     return '#CCC'
                }else{
                     return '#4BC6DF' 
                }
            })
            .transition()
            .duration(transitionSpeed)
            .attr('width',function(d){
                if(d.threshold_affect){
                     return xScale(d.seats_without_threshold)   
                }else{
                    if(app.get('threshold')){
                        var offset = parseFloat(xScale(d.seats_with_threshold)) - parseFloat(xScale(d.seats_without_threshold));
                        return offset
                    }else{
                        return 0
                    }
                }
            })
            .attr('x',function(d){
                if(!d.threshold_affect){
                    return xScale(d.seats_without_threshold) 
                }
            })
            .attr('y',0.5)
            .attr('height',barHeight-1)






        var seatLabel = barContainer.select('.seat_label')
        if(!update){
            seatLabel.attr('transform',function(d){
                if(app.get('threshold')){
                    if(d.threshold_affect){
                        return 'translate(' + (parseFloat(xScale(d.seats_without_threshold)) + 5) +',0)';
                    }else{
                        if(parseFloat(xScale(d.seats_with_threshold)) + 80 > parseInt(width)){
                            return 'translate(' + (parseInt(width)-80) +',0)';
                        }else{
                            return 'translate(' + (parseFloat(xScale(d.seats_with_threshold)) + 5) +',0)';
                        } 
                    }
                }else{
                    if(parseFloat(xScale(d.seats_without_threshold)) + 80 > parseInt(width)){
                        return 'translate(' + (parseInt(width)-80) +',0)';
                    }else{
                        return 'translate(' + (parseFloat(xScale(d.seats_without_threshold)) + 5) +',0)';
                    } 
                }
            })
        }
        seatLabel
            .transition()
            .duration(transitionSpeed)
            .attr('transform',function(d){
                if(app.get('threshold')){
                    if(d.threshold_affect){
                        return 'translate(' + (parseFloat(xScale(d.seats_without_threshold)) + 5) +',0)';
                    }else{
                        if(parseFloat(xScale(d.seats_with_threshold)) + 80 > parseInt(width)){
                            return 'translate(' + (parseInt(width)-80) +',0)';
                        }else{
                            return 'translate(' + (parseFloat(xScale(d.seats_with_threshold)) + 5) +',0)';
                        } 
                    }
                }else{
                    if(parseFloat(xScale(d.seats_without_threshold)) + 80 > parseInt(width)){
                        return 'translate(' + (parseInt(width)-80) +',0)';
                    }else{
                        return 'translate(' + (parseFloat(xScale(d.seats_without_threshold)) + 5) +',0)';
                    } 
                }
            })

        seatLabel.text('');

        seatLabel.append('rect').attr({
            x: -0.5,
            y: 4,
            width: 50,
            height: 21.5
        })
        .attr('fill',function(d){
            if(parseFloat(xScale(d.seats_with_threshold)) + 80 > parseInt(width)){
                return "rgba(255,255,255,0.9)"
            }else{
                return "transparent"
            }
        })

        var seatLabelText = seatLabel.append('text')

        var seatLabelTextWithout = seatLabelText
            .append('tspan')
            .text(function(d){
                if(d.threshold_affect){
                    var difference = d.seats_with_threshold - d.seats_without_threshold;
                    if(app.get('threshold')){
                        return Math.abs(difference) + " forfeited seats"
                    }else{
                        return d.seats_without_threshold + " seats won"
                    }
                    
                }else{
                    return d.seats_without_threshold + " seats won"
                }
            })
            .attr('y',function(d){
                if(d.threshold_affect){
                    return 20
                }else{
                    if(app.get('threshold')){
                        return 13
                    }else{
                        return 20
                    }
                    
                }
            })
            .attr('fill',function(d){
                if(d.threshold_affect){
                    if(app.get('threshold')){
                        return "#999"
                    }else{
                        return "#4BC6DF"
                    }
                    
                }else{
                    return "#4BC6DF"
                }
            })

        if(app.get('threshold')){
            var seatLabelTextWith = seatLabelText
            .append('tspan')
            .text(function(d){
                if(!d.threshold_affect){
                    var difference = d.seats_with_threshold - d.seats_without_threshold;
                    return "+" + difference + " bonus seats"
                }
            })
            .attr({
                'fill'  :'#95D0DD',
                'x'     : 0,
                'y'     : 25
            })
        }
        


        if(update){
            updateThreshold();
        }else{
            drawThreshold();
        }
        
        drawVerticalLines();
    }



    // VERTICAL MAJORITY LINES



    function drawVerticalLines(){
        var affectLength = currentElectionData.election_results.filter(function(district){
            return !district.threshold_affect
        }).length;

        var verticalLines = bars.selectAll('.verticalLine')
            .data(currentElectionData.milestones.majorities)

        verticalLines.enter()
            .append('line')
            .attr('class','verticalLine')

        verticalLines.attr('y1',0)
            .transition()
            .attr('x1',function(d){
                return xScale(d.seats)
            })
            .attr('x2',function(d){
                return xScale(d.seats)
            })
            .attr('stroke-width',1)
            .attr('stroke','rgba(0,0,0,0.08)')
            .transition()
            .duration(transitionSpeed)
            .attr('y2',function(d){
                if(app.get('threshold')){
                    return affectLength * (barHeight+barMargin) -3
                }else{
                    return currentElectionData.election_results.length * (barHeight+barMargin)
                }
            })

        var lineLabels = svg.selectAll('.lineLabel')
            .data(currentElectionData.milestones.majorities)

        lineLabels.enter()
            .append('text')
            .attr('class','lineLabel')

        lineLabels
            .text(function(d){return d.seats})
            .attr('text-anchor','middle')
            .style('font-size','11px')
            .attr('fill','#aeaeae')
            .attr('x',function(d){
                return xScale(d.seats)
            })
            .attr('y',10)

        lineLabels.exit().remove()
        verticalLines.exit().remove()
    }




    // THRESHOLD




    function drawThreshold(){
        var affectLength = currentElectionData.election_results.filter(function(district){
            return !district.threshold_affect
        }).length;
        oldaffectLength = affectLength;


        bars.append('line')
            .attr({
                'x1':0,
                'x2':width
            })
            .attr('y1', affectLength * (barHeight+barMargin) -3.5)
            .attr('y2',affectLength * (barHeight+barMargin) -3.5)
            .attr('class','thresholdline')
            .attr('stroke',function(){
                if(app.get('threshold')){
                    return 'rgba(0,0,0,0.08)'
                }else{
                    return 'rgba(0,0,0,0)'
                }
            })

        d3.select(vizContainer).append('p')
            .html('Below this line are parties with less than 10% of votes')
            .attr('class','thresholdLabel')
            .attr('style',function(){
                return "top:" + (affectLength * (barHeight+barMargin)+marginTop) + "px"
            })      
    }

    function updateThreshold(){
        var affectLength = currentElectionData.election_results.filter(function(district){
            return !district.threshold_affect
        }).length;
        

        if(oldaffectLength !== affectLength){
            bars.select('.thresholdline')
                .transition()
                .duration(transitionSpeed/4)
                .ease('linear')
                .attr('stroke','rgba(0,0,0,0)')
                .each('end',function(){
                    bars.select('.thresholdline')
                        .attr({
                            'x1':0,
                            'x2':width
                        })
                        .attr('y1',affectLength * (barHeight+barMargin)-3)
                        .attr('y2',affectLength * (barHeight+barMargin)-3)
                        .transition()
                        .duration(transitionSpeed/2)
                        .ease('linear')
                        .attr('stroke',function(){
                            if(app.get('threshold')){
                                return 'rgba(0,0,0,0.08)'
                            }else{
                                return 'rgba(0,0,0,0)'
                            }
                        })
                })
                
            d3.select(vizContainer).select('p')
                .transition()
                .duration(transitionSpeed/4)
                .ease('linear')
                .style('opacity',0)  
                .each('end',function(d){
                    d3.select(vizContainer).select('p')
                        .attr('style',function(){
                            return "top:" + (affectLength * (barHeight+barMargin) + marginTop) + "px; opacity:0;"
                        })  
                        .transition()
                        .duration(transitionSpeed/2)
                        .style('opacity',1)
                });
        }else{
            bars.select('.thresholdline')
                .transition()
                .duration(transitionSpeed/4)
                .attr('stroke',function(){
                    if(app.get('threshold')){
                        return 'rgba(0,0,0,0.08)'
                    }else{
                        return 'rgba(0,0,0,0)'
                    }
                })
        }
        oldaffectLength = affectLength;

    
    }


    return {
        init: init
    };
});
