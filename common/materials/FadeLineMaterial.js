import { Color } from 'three';
import { MaterialBase } from '../MaterialBase.js';

export class FadeLineMaterial extends MaterialBase {

	constructor( params ) {

		super( {

			defines: {
				HARD_CUTOFF: 0,
			},

			uniforms: {

				color: { value: new Color() },
				opacity: { value: 1 },
				currentMs: { value: 0 },
				fadeMs: { value: 10 },

			},

			vertexShader: /* glsl */`

				uniform uint currentMs;

				attribute uint creationMs;

                varying float relativeMs;
                void main() {

                    vec4 mvPosition = vec4( position, 1.0 );
                    mvPosition = modelViewMatrix * mvPosition;
                    gl_Position = projectionMatrix * mvPosition;

                    relativeMs = - float( currentMs - creationMs );

                }

            `,

			fragmentShader: /* glsl */`

				uniform uint currentMs;

                uniform vec3 color;
                uniform float opacity;
                uniform float fadeMs;
                varying float relativeMs;

                void main() {

                    float currValue = max( 0.0, relativeMs + fadeMs );
                    gl_FragColor.rgb = color;

					#if HARD_CUTOFF
					gl_FragColor.a = currValue <= 0.0 ? 0.0 : opacity;
					#else
                    gl_FragColor.a = opacity * currValue / fadeMs;
					#endif

                    #include <encodings_fragment>

                }

            `,

		} );

		this.setValues( params );

	}

}
