define([
    'd3',
    'ractive',
    'underscore',
    'json!data/electionData.json',
    'json!data/profileData.json',
    'text!templates/appTemplate.html',
    'text!templates/profileTemplate.html'
], function(
    d3,
    Ractive,
    _,
    electionData,
    profileData,
    templateHTML,
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
    var electionId = 0;

    var colors = {
        "AKP" : {
            "fill": "#ff9901",
            "shade": "#ffb24d"
        },
        "CHP" : {
            "fill": "#ff0309",
            "shade": "rgb(255, 108, 119)"
        },
        "MHP" : {
            "fill": "#2b72a8",
            "shade": "#4d88ad"
        },
        "HDP" : {
            "fill": "#8352b7",
            "shade": "#916bc1"
        },
        "Ind" : {
            "fill": "#8352b7",
            "shade": "#916bc1"
        },
    }

    function init(el, context, config, mediator) { 
        output = el;
        var hashValue = window.location.hash;

        // For now, I'm only using "Simulator"
        if(hashValue){
            hashValue = hashValue.replace('#','')
            if(hashValue === "simulator"){
                simulatorInit('simulator');
            }else if(hashValue === "simulator_simple"){
                simulatorInit('simulator_simple');
            }else if(hashValue.split('_')[0] === "profile"){
                profileInit(hashValue.split('_')[1]);
            }
        }
    }

    function profileInit(party){
        var editProfileData = profileData.map(function(profile){
            profile.description = profile.description.split("\n");
            return profile;
        })
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
        var templateFile = templateHTML;

        Ractive.DEBUG = false;
        app = new Ractive({
            el:output,
            template:templateFile,
            data:{
                electionData: data,
                currentElection: 'turkey2002',
                threshold:true
            }
        })

        if(template==="simulator_simple"){
            app.set('simple',true)
        }else{
            app.set('simple',false)
        }

        vizContainer = app.find('#vizWrapper');
        
        currentElectionData = app.get('electionData').filter(function(election){
            return election.id === app.get('currentElection');
        })[0];

        app.on('switchDataset',function(e,id){
            app.set('currentElection',id);
        })  

        app.on('switchThreshold',function(e,id){
            app.set('threshold',!app.get('threshold'));
        })

        app.on('clickStepper',function(e,step){
            var elections = ["turkey2002","turkey2011","turkey2015","uk2015","germany2013","australia2013"];
            var currentElectionId = app.get('currentElection');
            var electionIndex = elections.indexOf(currentElectionId);
            if(step==="next"){
                if(electionIndex === 5){
                    app.set('currentElection',elections[0])
                }else{
                    app.set('currentElection',elections[electionIndex+1])
                }
            }else if(step==="back"){
                if(electionIndex === 0){
                    app.set('currentElection',elections[5])
                }else{
                    app.set('currentElection',elections[electionIndex-1])
                }
            }
            
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

        app.observe('threshold',function(){
            if(!thresholdInit){
                drawRectangles(true);
            }
            thresholdInit = false;
        })  

        window.onresize = function(){
            var newWidth = d3.select(vizContainer).style('width');
            if(newWidth !== width){
                throttledInit();
            }
        }
        var throttledInit = _.throttle(vizInit,500);
        vizInit(); 
    }

    

    function vizInit(){
        barHeight = 40;
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
                if(!d.threshold_affect){
                   if(colors[d.party]){
                       return colors[d.party].fill
                   }else{
                       return '#4BC6DF'
                   } 
                }else{
                    return '#CCC'
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
                if(!d.threshold_affect){
                    if(colors[d.party]){
                        return colors[d.party].shade
                    }else{
                        return "rgb(149, 208, 221)"
                    }
                }else{
                    return "#fff"
                }
            })
            .attr('stroke',function(d){
                if(!d.threshold_affect){
                    if(colors[d.party]){
                        return colors[d.party].fill
                    }else{
                        return "#4BC6DF"
                    }
                }else{
                    return "#ccc"
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
                            return 'translate(' + 5 +',0)';
                        }else{
                            return 'translate(' + (parseFloat(xScale(d.seats_with_threshold)) + 5) +',0)';
                        } 
                    }
                }else{
                    if(parseFloat(xScale(d.seats_without_threshold)) + 80 > parseInt(width)){
                        return 'translate(' + 5 +',0)';
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
                            return 'translate(' + 5 +',0)';
                        }else{
                            return 'translate(' + (parseFloat(xScale(d.seats_with_threshold)) + 5) +',0)';
                        } 
                    }
                }else{
                    if(parseFloat(xScale(d.seats_without_threshold)) + 80 > parseInt(width)){
                        return 'translate(' + 5 +',0)';
                    }else{
                        return 'translate(' + (parseFloat(xScale(d.seats_without_threshold)) + 5) +',0)';
                    } 
                }
            })

        seatLabel.text('');

        var seatLabelText = seatLabel.append('text')

        var seatLabelTextWithout = seatLabelText
            .append('tspan')
            .text(function(d,i){
                var seatsText; 
                if(d.seats_without_threshold === 1){
                    seatsText = "seat"
                }else{
                    seatsText = "seats"
                }
                if(d.threshold_affect){
                    var difference = d.seats_with_threshold - d.seats_without_threshold;
                    if(app.get('threshold')){
                        return Math.abs(difference) + " forfeited " + seatsText
                    }else{
                        return d.seats_without_threshold + " " + seatsText + " won"
                    }
                }else{
                    return d.seats_without_threshold + " " + seatsText + " won"

                    
                }
            })
            .attr('y',function(d){
                if(d.threshold_affect){
                    return 24
                }else{
                    if(app.get('threshold')){
                        return 18
                    }else{
                        return 24
                    }
                    
                }
            })
            .attr('fill',function(d){
                if(d.threshold_affect){
                    return "#999" 
                }else{
                    if(app.get('threshold')){
                        if(parseFloat(xScale(d.seats_with_threshold)) + 80 > parseInt(width)){
                            return "#FFF"
                        }else{
                            if(colors[d.party]){
                                return colors[d.party].fill
                            }else{
                                return "#4BC6DF"
                            }   
                        }
                    }else{
                        if(parseFloat(xScale(d.seats_without_threshold)) + 80 > parseInt(width)){
                            return "#FFF"
                        }else{
                            if(colors[d.party]){
                                return colors[d.party].fill
                            }else{
                                return "#4BC6DF"
                            } 
                        }
                    }
                    
  
                }
            })

        if(app.get('threshold')){
            var seatLabelTextWith = seatLabelText
            .append('tspan')
            .text(function(d){
                if(!d.threshold_affect){
                    var difference = d.seats_with_threshold - d.seats_without_threshold;
                    var seatsText; 
                    if(difference === 1){
                        seatsText = "seat"
                    }else{
                        seatsText = "seats"
                    }
                    return "+" + difference + " bonus " + seatsText
                }
            })
            .attr({
                'x'     : 0,
                'y'     : 30
            })
            .attr('fill',function(d){
               if(parseFloat(xScale(d.seats_with_threshold)) + 80 > parseInt(width)){
                   return "rgba(255,255,255,0.8)"
               }else{
                   if(colors[d.party]){
                        return colors[d.party].shade
                    }else{
                        return "#95D0DD"
                    } 
               } 
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
            .html('Parties with less than 10% of votes')
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
