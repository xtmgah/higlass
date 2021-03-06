import {scaleLinear} from 'd3-scale';
import {bisector, range} from 'd3-array';
import {rgb, color} from 'd3-color';
import {format} from 'd3-format';

export function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

export function dictValues(dictionary) {
    /**
     * Return an array of values that are present in this dictionary
     */
    let values = [];

    for (let key in dictionary) {
        if (dictionary.hasOwnProperty(key)) {
            values.push(dictionary[key]);
        }
    }

    return values;
}

export function dictKeys(dictionary) {
    /**
     * Return an array of values that are present in this dictionary
     */
    let keys = [];

    for (let key in dictionary) {
        if (dictionary.hasOwnProperty(key)) {
            keys.push(key);
        }
    }

    return keys;
}

export function dictItems(dictionary) {
    /**
     * Return an array of (key,value) pairs that are present in this
     * dictionary
     */
    let keyValues = [];

    for (let key in dictionary) {
        if (dictionary.hasOwnProperty(key)) {
            keyValues.push([key, dictionary[key]]);
        }
    }

    return keyValues;
}

export function dictFromTuples(tuples) {
    /**
     * Create a dictionary from a list of [key,value] pairs.
     * @param tuples: A list of [key,value] pairs
     * @return: A dictionary
     */
    let dict = {};

    tuples.forEach(x => {
        dict[x[0]] = x[1];
    });

    return dict;
}

export function scalesCenterAndK(xScale, yScale) {
    /**
     * Calculate the center of the scale as well as its scale
     * factor
     *
     * Assumes the two scales have the same k
     *
     * @param xScale: A d3 scale.
     * @param yScale: A d3 scale.
     * @return: [domainCenter, k]
     */
    let xCenter = xScale.invert((xScale.range()[0] + xScale.range()[1]) / 2);
    let yCenter = yScale.invert((yScale.range()[0] + yScale.range()[1]) / 2);
    let k = xScale.invert(1) - xScale.invert(0);

    return [xCenter, yCenter, k];
}

export function positionedTracksToAllTracks(positionedTracks, includeCombinedContents = true) {
        /**
         * Convert the position indexed list of tracks:
         *
         * { 'top': [{line}, {bar}],
         *   'center': [{combined, contents: {heatmap, 2d-tiles}]
         *   ...
         *  }
         *
         *  To a flat list of tracks:
         *  { line, position: 'top'
         *   bar, position: 'top'
         *   ...
         *   }
         */
        let tracks = positionedTracks;
        let allTracks = [];

        for (let trackType in tracks) {
            let theseTracks = tracks[trackType]

            theseTracks.forEach(x => {
                if (x.type == 'combined') {
                    // we don't really deal with nested combined tracks here,
                    // but those shouldn't really be used anyway
                    if (includeCombinedContents) {
                        x.contents.forEach(y => {
                            allTracks.push(Object.assign(y, {position: trackType}));
                        });
                    }
                }

                allTracks.push(Object.assign(x, {position: trackType}));
            });
        }

        return allTracks;
    }

export function getTrackPositionByUid(allTracks, uid) {
        /**
         * Get a track's orientation by it's UID.
         */
        let tracks = positionedTracksToAllTracks(allTracks);
        let thisTrack = tracks.filter(x => x.uid == uid);

        return thisTrack[0].position;
    }

export function listAllTracks(tracks) {
    let allTracks = []

    for (let trackType in tracks) {
        allTracks = allTracks.concat[trackType];
    }

    return allTracks;
}

export function getTrackByUid(tracks, uid) {
        /**
         * Return the track object for the track corresponding to this uid
         *
         * Null or undefined if none.
         */
        for (let trackType in tracks) {
            let theseTracks = tracks[trackType];

            let filteredTracks = theseTracks.filter((d) => { return d.uid == uid; });

            if (filteredTracks.length)
                return filteredTracks[0];

            // check to see if this track is part of a combined track
            let combinedTracks = theseTracks.filter((d) => { return d.type == 'combined'; });

            if (combinedTracks.length) {
                for (let i = 0; i < combinedTracks.length; i++) {
                    let ct = combinedTracks[i];
                    let filteredTracks = ct.contents.filter(d => d.uid == uid);

                    if (filteredTracks.length)
                        return filteredTracks[0];
                }
            }
        }

        return null;
    }

export function colorDomainToRgbaArray(colorRange) {
    /**
     * Convert a color domain to a 255 element array of [r,g,b,a]
     * values (all from 0 to 255). The last color (255) will always be
     * transparent
     */

    // we should always have at least two values in the color range
    let domain = colorRange.map((x,i) =>  i * (255 / (colorRange.length - 1)) );

    let d3Scale = scaleLinear().domain(domain)
        .range(colorRange)

    let rgbaArray = range(254,-1,-1).map(d3Scale)
    .map(x => {
        let r = rgb(x);
        return [r.r, r.g, r.b, 255];
    })

    // add a transparent color at the end for missing values
    rgbaArray.push([255,255,255,0]);

    return rgbaArray;
}

export function colorToHex(colorValue) {
    /**
     * Convert a regular color value (e.g. 'red', '#FF0000', 'rgb(255,0,0)') to a
     * hex value which is legible by PIXI
     */
    let c = color(colorValue);
    let hex = PIXI.utils.rgb2hex([c.r / 255., c.g / 255., c.b / 255.]);

    return hex
}

const chromInfoBisector = bisector((d) => { return d.pos }).left;

export function absoluteToChr(absPosition, chromInfo) {
    let insertPoint = chromInfoBisector(chromInfo.cumPositions, absPosition);
    const lastChr = chromInfo.cumPositions[chromInfo.cumPositions.length-1].chr;
    const lastLength = chromInfo.chromLengths[lastChr];

    if (insertPoint > 0) { insertPoint -= 1; }

    let chrPosition = Math.floor(
        absPosition - chromInfo.cumPositions[insertPoint].pos
    );
    let offset = 0;

    if (chrPosition < 0) {
        // before the start of the genome
        offset = chrPosition - 1;
        chrPosition = 1;
    }

    if (
        insertPoint == chromInfo.cumPositions.length - 1 &&
        chrPosition > lastLength
    ) {
        // beyond the last chromosome
        offset = chrPosition - lastLength;
        chrPosition = lastLength;
    }

    return [
        chromInfo.cumPositions[insertPoint].chr,
        chrPosition,
        offset,
        insertPoint
    ]
}

export function scalesToGenomeLocations(xScale, yScale, chromInfo) {
    if (chromInfo === null) { return; }

    if (!xScale || !yScale) { return; }

    let x1 = absoluteToChr(xScale.domain()[0], chromInfo);
    let x2 = absoluteToChr(xScale.domain()[1], chromInfo);

    let y1 = absoluteToChr(yScale.domain()[0], chromInfo);
    let y2 = absoluteToChr(yScale.domain()[1], chromInfo);

    return [
        x1[0], Math.round(x1[1]),
        x2[0], Math.round(x2[1]),
        y1[0], Math.round(y1[1]),
        y2[0], Math.round(y2[1])
    ];
  }


export function relToAbsChromPos (chrom, x, y, chromInfo) {
    return [
        chromInfo.chrPositions[chrom].pos + x,
        chromInfo.chrPositions[chrom].pos + y
    ]
}

export function totalTrackPixelHeight(view) {
      /**
       * Calculate the total height of the horizontal and center
       * tracks in pixels
       *
       * Parameters
       * -----------
       *
       *  view : view config object
       *    A typical view configuration containing a list of tracks
       *
       * Returns
       * -------
       *  int
       *    The total height of the top, center and bottom tracks
       */
      if (!view.tracks)
          // no tracks means no height
          return 0;

      let totalHeight = 0;
      
      if (view.tracks.top) 
          totalHeight += view.tracks.top.map(x => x.height).reduce((a,b) => a + b, 0);

      if (view.tracks.center) 
          totalHeight += view.tracks.center.map(x => x.height).reduce((a,b) => a + b, 0);

      if (view.tracks.bottom)
          totalHeight += view.tracks.bottom.map(x => x.height).reduce((a,b) => a + b, 0);

      return totalHeight;
  }

/**
 * Export a PIXI text to an SVG element
 *
 * param {PIXI.Text} pixiText A PIXI.Text object that we want to create an SVG element for
 * returns {Element} A DOM SVG Element with all of the attributes set as to display
 * the given text.
 */
export function PIXITextToSvg(pixiText) {
    let g = document.createElement('g');
    let t = document.createElement('text');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-family', pixiText.style.fontFamily);
    t.setAttribute('font-size', pixiText.style.fontSize);
    g.setAttribute('transform', `scale(${pixiText.scale.x},1)`);

    t.setAttribute('fill', pixiText.style.fill);
    t.innerHTML = pixiText.text;

    g.appendChild(t);
    g.setAttribute('transform', `translate(${pixiText.x},${pixiText.y})scale(${pixiText.scale.x},1)`);

    return g;
}

/**
 * Create a line as a SVG element
 *
 * @param {int,int} x1,y1 The coordinates for the start of the line
 * @param {int,int} x2,y2 The coordinates for the end of the line
 */
export function SVGLine(x1, y1, x2, y2, strokeWidth, strokeColor) {
    let line = document.createElement('line');

    line.setAttribute('x1', x1);
    line.setAttribute('x2', x2);
    line.setAttribute('y1', y1);
    line.setAttribute('y2', y2);

    if (strokeWidth)
        line.setAttribute('stroke-width', strokeWidth);
    if (strokeColor)
        line.setAttribute('stroke', strokeColor)

    return line;
}
